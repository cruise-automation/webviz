// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { Time } from "rosbag";

import type { Message } from "webviz-core/src/players/types";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";
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

type MessageDescriptorCommon = {|
  datatype: string,
  datatypesIndex: number,
|};

type BinaryMessageDescriptor = {|
  ...MessageDescriptorCommon,
  binaryDataIndex: number,
  offset: number,
  length?: number,
|};

type ParsedMessageDescriptor = {|
  ...MessageDescriptorCommon,
  message: any, // For deep-parsed fields
  // Complex fields are for nested bobjects that contain binary data, either directly or at some
  // deeper nesting level.
  complexFields: { name: string, descriptor: BinaryMessageDescriptor | ParsedMessageDescriptor }[],
|};
type MessageDescriptor = BinaryMessageDescriptor | ParsedMessageDescriptor;

type TransferData = $ReadOnly<{|
  action: string,
  additionalTransferables: any,
  messageData: $ReadOnlyArray<
    $ReadOnly<{|
      topic: string,
      receiveTime: Time,
      descriptor: MessageDescriptor,
    |}>
  >,
  newStorageData: any[],
  clearStorageData: boolean,
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
  _sentItems: number = 0;

  constructor(rpc: Rpc) {
    this._rpc = rpc;
    this._registry = new FinalizationRegistry((index) => {
      this._rpc.send<void>("$$remove_gc_item", { index });
    });
  }

  isEmpty() {
    return this._sentItems === 0;
  }

  // Sometimes we want to "put" an item that doesn't have a stable identity, but one of its children
  // does. So let the user specify that child if they want.
  // Sometimes we need to do some expensive copying before transferring SharedArrayBuffer objects to
  // SharedWorker contexts. This should be avoided when necessary, so `item` is wrapped in a
  // function so it can be performed only when the identityItem check fails.
  getIndex({ item, identityItem }: { item: () => any, identityItem: any }, newStorageData: any[]): number {
    const maybeIndex = this._map.get(identityItem);
    if (maybeIndex != null) {
      return maybeIndex;
    }
    const newIndex = this._sentItems;
    this._sentItems += 1;
    this._map.set(identityItem, newIndex);
    this._registry.register(identityItem, newIndex);
    newStorageData.push(item());
    return newIndex;
  }
}

class GarbageCollectedReceiver {
  _storage: any[] = [];

  constructor(rpc: Rpc) {
    rpc.receive("$$remove_gc_item", ({ index }) => {
      this._storage[index] = null;
    });
  }

  addItems(items: any[], clearStorageData: boolean) {
    if (clearStorageData) {
      this._storage = [];
    }
    items.forEach((item) => {
      this._storage.push(item);
    });
  }

  getItem(index: number) {
    return this._storage[index];
  }
}

export class BobjectRpcSender {
  _cloneBuffers: boolean; // Sending SharedArrayBuffer objects to SharedWorkers fails.
  _rpc: Rpc;
  _gcDataSender: GarbageCollectedSender;
  _binaryStructureByTopic: { [topic: string]: { value: ?PartialBinaryDataLocations } } = {};

  constructor(rpc: Rpc, cloneBuffers?: boolean = false) {
    this._rpc = rpc;
    this._gcDataSender = new GarbageCollectedSender(rpc);
    this._cloneBuffers = cloneBuffers;
  }

  async send<T>(action: string, messages: Message[], additionalTransferables: any): Promise<T> {
    // Don't Promise.all this, sometimes we refer to buffers multiple times, and only want to send them once each.
    const messageData = [];
    const newStorageData = [];
    const clearStorageData = this._gcDataSender.isEmpty();
    for (const msg of messages) {
      const { topic, receiveTime, message } = msg;
      const messageSourceData = getSourceData(Object.getPrototypeOf(message).constructor);
      if (messageSourceData == null) {
        throw new Error("Missing datatypes for message. Likely not a bobject.");
      }
      const binaryStructure = this._getBinaryStructure(topic, message).value;
      messageData.push({
        topic,
        receiveTime,
        descriptor: this._getTransferData(message, binaryStructure, messageSourceData, newStorageData),
      });
    }
    const ret = await this._rpc.send<T>("$$transferBobjects", {
      action,
      additionalTransferables,
      messageData,
      newStorageData,
      clearStorageData,
    });
    return ret;
  }

  _getBinaryStructure(topic: string, message: any) {
    const structure = this._binaryStructureByTopic[topic];
    if (structure != null) {
      return structure;
    }
    return (this._binaryStructureByTopic[topic] = findBinaryDataLocations(message));
  }

  _getDatatypesIndex(datatypes: RosDatatypes, newStorageData: any[]) {
    return this._gcDataSender.getIndex({ item: () => datatypes, identityItem: datatypes }, newStorageData);
  }
  _getBinaryDataIndex(buffer: ArrayBuffer, bigString: string, newStorageData: any[]) {
    const data = this._cloneBuffers
      ? {
          item: () => {
            const u = new Uint8Array(buffer.byteLength);
            u.set(new Uint8Array(buffer));
            return { buffer: u.buffer, bigString };
          },
          identityItem: buffer,
        }
      : { item: () => ({ buffer, bigString }), identityItem: buffer };
    return this._gcDataSender.getIndex(data, newStorageData);
  }

  _getTransferData(
    inputMessage: any,
    binaryStructure: ?PartialBinaryDataLocations,
    messageSourceData: BobjectSourceData,
    newStorageData: any[]
  ) {
    const { datatypes, datatype } = messageSourceData;
    const datatypesIndex = this._getDatatypesIndex(datatypes, newStorageData);
    if (binaryStructure == null) {
      // Fully binary or fully parsed. Need to check which one dynamically to be safe.
      if (messageSourceData.buffer) {
        const { buffer, bigString } = messageSourceData;
        const binaryDataIndex = this._getBinaryDataIndex(buffer, bigString, newStorageData);
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
          descriptor: this._getTransferData(fieldValue, binaryStructure[fieldName], sourceData, newStorageData),
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
    rpc.receive("$$transferBobjects", async (transferData: TransferData) => {
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
  receive(action: string, format: "parsed" | "bobject", callback: (Message[], any) => Promise<any>) {
    this._receiveFunctions[action] = async (transferData) => {
      this._gcDataReceiver.addItems(transferData.newStorageData, transferData.clearStorageData);
      const messages = transferData.messageData.map(({ topic, receiveTime, descriptor }) => ({
        topic,
        receiveTime,
        message: this._formatMessage(format, descriptor),
      }));
      return callback(messages, transferData.additionalTransferables);
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
