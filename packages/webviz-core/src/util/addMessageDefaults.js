// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { rosPrimitiveTypes } from "rosbag";

import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";
import { isComplex } from "webviz-core/src/util/binaryObjects/messageDefinitionUtils";

function getPrimitiveDefault(type: string) {
  if (type === "string") {
    return "";
  } else if (type === "bool") {
    return false;
  } else if (type === "float32" || type === "float64") {
    return NaN;
  } else if (
    type === "int8" ||
    type === "uint8" ||
    type === "int16" ||
    type === "uint16" ||
    type === "int32" ||
    type === "uint32" ||
    type === "int64" ||
    type === "uint64"
  ) {
    return 0;
  } else if (type === "time" || type === "duration") {
    return { sec: 0, nsec: 0 };
  } else if (type === "json") {
    return {};
  }
}

// Provides (nested, recursive) defaults for a message of a given datatype. Modifies messages in-place for performance.
export default function addMessageDefaults(datatypes: RosDatatypes, datatypeName: string, object: any) {
  if (!datatypes[datatypeName]) {
    throw new Error(`addMessageDefaults: datatype "${datatypeName}" missing from datatypes`);
  }
  for (const { name, type, isConstant, isArray } of datatypes[datatypeName].fields) {
    // Don't set any constant fields - they are not written anyways.
    if (!isConstant && object[name] == null) {
      if (isArray) {
        object[name] = [];
      } else if (rosPrimitiveTypes.has(type)) {
        object[name] = getPrimitiveDefault(type);
      } else if (isComplex(type)) {
        object[name] = {};
        addMessageDefaults(datatypes, type, object[name]);
      } else {
        throw new Error(`addMessageDefaults: object of type "${datatypeName}" is missing field "${name}"`);
      }
    } else if (!isConstant && isComplex(type)) {
      if (isArray) {
        for (const index in object[name]) {
          addMessageDefaults(datatypes, type, object[name][index]);
        }
      } else {
        addMessageDefaults(datatypes, type, object[name]);
      }
    } else if (!isConstant && isArray) {
      for (const index in object[name]) {
        if (object[name][index] == null) {
          object[name][index] = getPrimitiveDefault(type);
        }
      }
    }
  }
}
