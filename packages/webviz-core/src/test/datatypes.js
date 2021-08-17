// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { groupBy } from "lodash";
import { type RosMsgField } from "rosbag";

import type { Frame, Message, Topic, TypedMessage } from "webviz-core/src/players/types";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";
import { getObjects, wrapJsObject } from "webviz-core/src/util/binaryObjects";
import { BobWriter, getSerializeFunctions } from "webviz-core/src/util/binaryObjects/binaryMessageWriter";

// eslint-disable-next-line no-use-before-define
type InferredObject = { [field: string]: FieldType };

type FieldType =
  | { type: "string", isArray: boolean }
  | { type: "json", isArray: boolean }
  | { type: "bool", isArray: boolean }
  | { type: "int8", isArray: boolean }
  | { type: "uint8", isArray: boolean }
  | { type: "float64", isArray: boolean }
  | { type: "message", isArray: boolean, object: InferredObject }
  | { type: "unknown", isArray: boolean };

const maybeInferJsonFieldType = (value: any, fieldName: string): ?FieldType => {
  // Current heuristic: "Looks like metadata in a marker".
  // This heuristic doesn't cover every case of JSON data we might want to support, so we might want
  // to make this pluggable in the future.
  // "Markers" sometimes have some missing fields, but these ones always seem to be present:
  const hasMarkerFields = ["header", "ns", "id", "type", "action", "pose"].every((field) => value[field] != null);
  const hasIconMarkerFields = ["header", "position", "icon_type", "text", "outline_color", "metadata"].every(
    (field) => value[field] != null
  );
  if (!hasMarkerFields && !hasIconMarkerFields) {
    return;
  }
  if (fieldName === "metadata" || fieldName === "metadataByIndex") {
    return { type: "json", isArray: false };
  }
  if (fieldName.toLowerCase().includes("json")) {
    return { type: "json", isArray: false };
  }
};

export const inferDatatypes = (fieldType: FieldType, value: any): FieldType => {
  if (fieldType.type === "json") {
    // Don't do object structure inference on something we think is a JSON field.
    // Do this check first in case it's a JSON-encoded string or something.
    return fieldType;
  } else if (typeof value === "string") {
    if (fieldType.type !== "string" && fieldType.type !== "unknown") {
      throw new Error("Type mismatch");
    }
    return { isArray: fieldType.isArray, type: "string" };
  } else if (typeof value === "number") {
    if (fieldType.type !== "float64" && fieldType.type !== "unknown") {
      throw new Error("Type mismatch");
    }
    return { isArray: fieldType.isArray, type: "float64" };
  } else if (typeof value === "boolean") {
    if (fieldType.type !== "bool" && fieldType.type !== "unknown") {
      throw new Error("Type mismatch");
    }
    return { isArray: fieldType.isArray, type: "bool" };
  } else if (value instanceof Uint8Array) {
    return { isArray: true, type: "uint8" };
  } else if (value instanceof Int8Array) {
    return { isArray: true, type: "int8" };
  } else if (ArrayBuffer.isView(value)) {
    return { isArray: true, type: "float64" };
  } else if (value == null) {
    // Shouldn't happen, but we should be robust against it. Keep whatever information we have.
    return fieldType;
  } else if (value instanceof Array) {
    return value.reduce(inferDatatypes, fieldType);
  }
  // Message. Make a new type if the field is currently of unknown type.
  const ret = fieldType.type === "unknown" ? { type: "message", isArray: fieldType.isArray, object: {} } : fieldType;

  if (ret.type !== "message") {
    throw new Error("Type mismatch");
  }
  const inferredObject = ret.object;
  Object.keys(value).forEach((fieldName) => {
    const fieldValue = value[fieldName];
    if (inferredObject[fieldName] == null) {
      const jsonFieldType = maybeInferJsonFieldType(value, fieldName);
      inferredObject[fieldName] = jsonFieldType ?? { type: "unknown", isArray: fieldValue instanceof Array };
    }
    inferredObject[fieldName] = inferDatatypes(inferredObject[fieldName], fieldValue);
  });
  return ret;
};

const addRosDatatypes = (
  datatypes: RosDatatypes,
  object: InferredObject,
  datatype: string,
  getTypeName: () => string
): void => {
  const fields = Object.keys(object).map(
    (fieldName): RosMsgField => {
      const inferredField = object[fieldName];
      switch (inferredField.type) {
        case "bool":
        case "int8":
        case "uint8":
        case "float64":
        case "string":
        case "json":
        case "unknown": {
          const type = inferredField.type === "unknown" ? "bool" : inferredField.type;
          return { name: fieldName, isComplex: false, isArray: inferredField.isArray, type };
        }
        case "message": {
          const type = getTypeName();
          addRosDatatypes(datatypes, inferredField.object, type, getTypeName);
          return { name: fieldName, isComplex: true, isArray: inferredField.isArray, type };
        }
        default:
          throw new Error(`Bad type ${inferredField.type}`);
      }
    }
  );
  datatypes[datatype] = { fields };
};

export const createRosDatatypesFromFrame = (topics: $ReadOnlyArray<Topic>, frame: Frame): RosDatatypes => {
  // Note: datatypes are duplicated when they appear in multiple places, and "common" datatypes like
  // markers and times do not get their "real" names. We might consider adding a "seed" set of known
  // datatypes, and doing structural deduplication in a post-processing step.
  const ret = {};
  topics.forEach(({ name, datatype }) => {
    const messages = frame[name];
    if (messages == null) {
      return;
    }
    // We run type inference on every message because some messages may contain empty arrays,
    // leaving full message definitions incomplete.
    const schema = messages.map(({ message }) => message).reduce(inferDatatypes, { type: "unknown", isArray: false });
    // If there are no messages it'll just be unknown. Probably fine.
    if (schema.type === "message") {
      let typesDeclared = 0;
      const getTypeName = () => `test_msgs${name}/auto_${typesDeclared++}`;
      addRosDatatypes(ret, schema.object, datatype, getTypeName);
    }
  });
  return ret;
};

export const wrapMessages = <T>(messages: $ReadOnlyArray<Message>, wrapAsJsObjects: ?boolean): TypedMessage<T>[] => {
  const frame = groupBy(messages, "topic");
  const topics = Object.keys(frame).map((topic) => ({ name: topic, datatype: topic }));
  const datatypes = createRosDatatypesFromFrame(topics, frame);
  if (wrapAsJsObjects) {
    // Some tests depend on nulled fields, which don't happen with binary messages.
    return messages.map(({ topic, receiveTime, message }) => ({
      topic,
      receiveTime,
      message: wrapJsObject(datatypes, topic, message),
    }));
  }
  // Serialize messages to binary. This has slightly beter fidelity when crossing worker boundaries.
  // If wrapped JS objects contain wrapped JS objects, and the outer object has inexact datatypes,
  // deep-parsing is lossy. If the inner objects are binary then there won't be any deep-parsing --
  // they'll be sent to the in binary form and wrapped with their original datatypes.
  const writer = new BobWriter();
  const serializeFunctions = getSerializeFunctions(datatypes, writer);
  const messageMap = new Map(); // maintain input:output message order.
  Object.keys(frame).forEach((topic) => {
    const frameMessages = frame[topic];
    const offsets = frameMessages.map(({ message }) => serializeFunctions[topic](message));
    const { buffer, bigString } = writer.write();
    getObjects(datatypes, topic, buffer, bigString, offsets).forEach((message: any, i) => {
      messageMap.set(frameMessages[i], { ...frameMessages[i], message });
    });
  });
  return messages.map((m) => messageMap.get(m)).filter(Boolean);
};

export const wrapMessage = <T>(message: Message): TypedMessage<T> => wrapMessages<T>([message])[0];

// Objects are assumed to be of the same type
export const wrapObjects = <T>(objects: $ReadOnlyArray<{}>): T[] => {
  const messages = objects.map((message) => ({ receiveTime: { sec: 0, nsec: 0 }, topic: "dummy", message }));
  return wrapMessages<T>(messages).map(({ message }) => message);
};
