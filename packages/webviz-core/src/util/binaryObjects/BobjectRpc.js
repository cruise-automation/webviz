// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { Time } from "rosbag";

import type { Message } from "webviz-core/src/players/types";
import {
  bobjectFieldNames,
  deepParse,
  getBinaryArrayView,
  getBinaryOffset,
  getObjects,
  isBobject,
  wrapJsObject,
} from "webviz-core/src/util/binaryObjects";
import { getSourceData, type BobjectSourceData } from "webviz-core/src/util/binaryObjects/messageDefinitionUtils";
import Rpc from "webviz-core/src/util/Rpc";

type MessageDescriptorCommon = $ReadOnly<{|
  datatype: string,
  datatypesIndex: number,
|}>;

type BinaryMessageDescriptor = $ReadOnly<{|
  ...MessageDescriptorCommon,
  binaryDataIndex: number,
  offset: number,
  length?: number,
|}>;

type ParsedMessageDescriptor = $ReadOnly<{|
  ...MessageDescriptorCommon,
  message: any, // For deep-parsed fields
  // Complex fields are for nested bobjects that contain binary data, either directly or at some
  // deeper nesting level.
  complexFields: { name: string, descriptor: BinaryMessageDescriptor | ParsedMessageDescriptor }[],
|}>;
type MessageDescriptor = BinaryMessageDescriptor | ParsedMessageDescriptor;

type TransferData = $ReadOnly<{|
  action: string,
  topic: string,
  receiveTime: Time,
  additionalTransferables: any,
  data: MessageDescriptor,
|}>;

// For a given topic, this tree contains paths through the data where mixed parsed/binary messages
// have been seen. (Completely binary messages and completely parsed reverse-wrapped messages are
// not specified.)
// The current strategy is to search the first message seen in a topic for a given
// BobjectRpcSender, and to stop searching when we see arrays or binary messages.
type PartialBinaryDataLocations = { [field: string]: PartialBinaryDataLocations };
type BinaryClassification = PartialBinaryDataLocations | "all_binary" | "all_parsed";

function findBinaryDataLocationsImpl(bobject: any, sourceData: BobjectSourceData): BinaryClassification {
  if (sourceData.buffer) {
    return "all_binary";
  }
  const ret = {};
  let containsBinary;
  // Parsed message. Explore children.
  for (const fieldName of bobjectFieldNames(bobject)) {
    const fieldValue = bobject[fieldName]();
    const fieldSourceData = fieldValue && getSourceData(Object.getPrototypeOf(fieldValue).constructor);
    if (fieldSourceData) {
      const childLocations = findBinaryDataLocationsImpl(fieldValue, fieldSourceData);
      if (childLocations !== "all_parsed") {
        containsBinary = true;
        if (childLocations !== "all_binary") {
          ret[fieldName] = childLocations;
        }
      }
    }
  }
  return containsBinary ? ret : "all_parsed";
}

// Exported for tests
export function findBinaryDataLocations(bobject: any): { value: ?PartialBinaryDataLocations } {
  const sourceData = getSourceData(Object.getPrototypeOf(bobject).constructor);
  const classification = sourceData ? findBinaryDataLocationsImpl(bobject, sourceData) : "all_parsed";
  return { value: classification === "all_parsed" || classification === "all_binary" ? null : classification };
}

// The policy of this sender is to delete things from the receiving worker when they're garbage
// collected in the sending thread. We might want to try some LRU scheme instead if this causes
// issues later.
class GarbageCollectedSender {
  _map: WeakMap<any, number> = new WeakMap();
  _registry: FinalizationRegistry;
  _rpc: Rpc;

  constructor(rpc: Rpc) {
    this._rpc = rpc;
    this._registry = new FinalizationRegistry((index) => {
      this._rpc.send<void>("$$remove_gc_item", { index });
    });
  }

  // Sometimes we want to "put" an item that doesn't have a stable identity, but one of its children
  // does. So let the user specify that child if they want.
  async getIndex(item: any, identityItem: ?any = item): Promise<number> {
    const storedIndex = this._map.get(identityItem);
    if (storedIndex != null) {
      return storedIndex;
    }
    const { index } = await this._rpc.send<{ index: number }>("$$add_gc_item", { item });
    this._map.set(identityItem, index);
    this._registry.register(identityItem, index);
    return index;
  }
}

class GarbageCollectedReceiver {
  _storage: any[] = [];

  constructor(rpc: Rpc) {
    rpc.receive("$$add_gc_item", ({ item }) => {
      this._storage.push(item);
      return { index: this._storage.length - 1 };
    });
    rpc.receive("$$remove_gc_item", ({ index }) => {
      this._storage[index] = null;
    });
  }

  getItem(index: number) {
    return this._storage[index];
  }
}

export class BobjectRpcSender {
  _rpc: Rpc;
  _gcDataSender: GarbageCollectedSender;
  _binaryStructureByTopic: { [topic: string]: { value: ?PartialBinaryDataLocations } } = {};

  constructor(rpc: Rpc) {
    this._rpc = rpc;
    this._gcDataSender = new GarbageCollectedSender(rpc);
  }

  async send<T>(action: string, { topic, receiveTime, message }: Message, additionalTransferables: any): Promise<T> {
    const messageSourceData = getSourceData(Object.getPrototypeOf(message).constructor);
    if (messageSourceData == null) {
      throw new Error("Missing datatypes for message. Likely not a bobject.");
    }
    const binaryStructure = this._getBinaryStructure(topic, message).value;
    const data: TransferData = {
      action,
      topic,
      receiveTime,
      data: await this._getTransferData(message, binaryStructure, messageSourceData),
      additionalTransferables,
    };
    return this._rpc.send<T>("$$transferBobject", data);
  }

  _getBinaryStructure(topic: string, message: any) {
    const structure = this._binaryStructureByTopic[topic];
    if (structure != null) {
      return structure;
    }
    return (this._binaryStructureByTopic[topic] = findBinaryDataLocations(message));
  }

  async _getTransferData(
    inputMessage: any,
    binaryStructure: ?PartialBinaryDataLocations,
    messageSourceData: BobjectSourceData
  ) {
    const { datatypes, datatype } = messageSourceData;
    const datatypesIndex = await this._gcDataSender.getIndex(datatypes);
    if (binaryStructure == null) {
      // Fully binary or fully parsed. Need to check which one dynamically to be safe.
      if (messageSourceData.buffer) {
        const binaryDataIndex = await this._gcDataSender.getIndex(
          { buffer: messageSourceData.buffer, bigString: messageSourceData.bigString },
          messageSourceData.buffer
        );
        return messageSourceData.isArrayView
          ? { datatype, datatypesIndex, binaryDataIndex, offset: inputMessage.offset(), length: inputMessage.length() }
          : { datatype, datatypesIndex, binaryDataIndex, offset: getBinaryOffset(inputMessage) };
      }
      return { datatype, datatypesIndex, message: deepParse(inputMessage), complexFields: [] };
    }
    // Mixed binary/parsed
    const complexFields = [];
    const message = {};
    for (const fieldName of bobjectFieldNames(inputMessage)) {
      const fieldValue = inputMessage[fieldName]();
      const sourceData = fieldValue && getSourceData(Object.getPrototypeOf(fieldValue).constructor);
      if (sourceData) {
        complexFields.push({
          name: fieldName,
          descriptor: await this._getTransferData(fieldValue, binaryStructure[fieldName], sourceData),
        });
      } else {
        message[fieldName] = isBobject(fieldValue) ? deepParse(fieldValue) : fieldValue;
      }
    }
    return { datatype, datatypesIndex, message, complexFields };
  }
}

export class BobjectRpcReceiver {
  _rpc: Rpc;
  _receiveFunctions: { [action: string]: (TransferData) => Promise<any> } = {};
  _gcDataReceiver: GarbageCollectedReceiver;

  constructor(rpc: Rpc) {
    this._rpc = rpc;
    this._gcDataReceiver = new GarbageCollectedReceiver(rpc);
    rpc.receive("$$transferBobject", async (transferData: TransferData) => {
      const receiveFunction = this._receiveFunctions[transferData.action];
      if (receiveFunction == null) {
        throw new Error(`action ${transferData.action} not registered`);
      }
      return receiveFunction(transferData);
    });
  }

  // Note: Return values are expected to be plain JS objects, not bobjects. Maybe we can extend this
  // in the future.
  // Specifying the format here (instead of always providing bobjects that users can deep-parse)
  // allows for more efficient parsed->parsed transfers, with no need to wrap/deepParse.
  receive(action: string, format: "parsed" | "bobject", callback: (Message, any) => Promise<any>) {
    this._receiveFunctions[action] = async (transferData) => {
      const message = this._formatMessage(format, transferData.data);
      return callback(
        { topic: transferData.topic, receiveTime: transferData.receiveTime, message },
        transferData.additionalTransferables
      );
    };
  }

  _decodeBinaryBobject(data: BinaryMessageDescriptor) {
    const { datatypesIndex, datatype, offset, length } = data;
    const datatypes = this._gcDataReceiver.getItem(datatypesIndex);
    const { buffer, bigString } = this._gcDataReceiver.getItem(data.binaryDataIndex);
    if (length == null) {
      return getObjects(datatypes, datatype, buffer, bigString, [offset])[0];
    }
    return getBinaryArrayView(datatypes, datatype, buffer, bigString, offset, length);
  }

  _decodeParsedBobject(data: ParsedMessageDescriptor) {
    const { complexFields, datatypesIndex, datatype } = data;
    const message = { ...data.message };
    complexFields.forEach((field) => {
      message[field.name] = this._decodeBobject(field.descriptor);
    });
    const datatypes = this._gcDataReceiver.getItem(datatypesIndex);
    return wrapJsObject(datatypes, datatype, message);
  }

  _decodeBobject(data: MessageDescriptor) {
    if (data.complexFields) {
      return this._decodeParsedBobject(data);
    }
    return this._decodeBinaryBobject(data);
  }

  _formatMessage(format: "parsed" | "bobject", descriptor: MessageDescriptor) {
    if (format === "parsed" && descriptor.complexFields && descriptor.complexFields.length === 0) {
      // Optimization: For pure-parsed bobjects that we want in parsed form, there's no need to wrap
      // them.
      return descriptor.message;
    }
    const bobject = this._decodeBobject(descriptor);
    return format === "parsed" ? deepParse(bobject) : bobject;
  }
}
