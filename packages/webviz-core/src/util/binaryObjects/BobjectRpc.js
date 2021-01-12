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
import { deepParse, getBinaryData, getObjects, wrapJsObject } from "webviz-core/src/util/binaryObjects";
import { getDatatypes } from "webviz-core/src/util/binaryObjects/messageDefinitionUtils";
import Rpc from "webviz-core/src/util/Rpc";

type CommonTransferData = $ReadOnly<{|
  action: string,
  topic: string,
  receiveTime: Time,
  datatype: string,
  datatypesIndex: number,
  additionalTransferables: any,
|}>;

type BinaryTransferData = $ReadOnly<{|
  ...CommonTransferData,
  offset: number,
  type: "binary",
|}>;

type ParsedTransferData = $ReadOnly<{|
  ...CommonTransferData,
  message: any,
  type: "parsed",
|}>;

type TransferData = BinaryTransferData | ParsedTransferData;

export class BobjectRpcSender {
  _rpc: Rpc;
  // TODO(steel): Consider using WeakRefs so we can clean up datatypes in the Receiver when these
  // values get garbage collected.
  _datatypesIndices: WeakMap<RosDatatypes, number> = new WeakMap();
  _numberOfDatatypesSent: number = 0;
  // Note: We only keep a single "current" buffer/bigString per topic for simplicity. Normally it
  // should be fast because we just send messages in time-order, and should be memory-efficient.
  // We could do the same WeakRef strategy considered for datatypes to properly signal garbage
  // collection, though.
  _buffersByTopic: { [topic: string]: ArrayBuffer } = {};

  constructor(rpc: Rpc) {
    this._rpc = rpc;
  }

  async send<T>(action: string, { topic, receiveTime, message }: Message, additionalTransferables: any): Promise<T> {
    const messageDatatypeInfo = getDatatypes(Object.getPrototypeOf(message).constructor);
    if (messageDatatypeInfo == null) {
      throw new Error("Missing datatypes for message. Likely not a bobject.");
    }
    const [datatypes, datatype] = messageDatatypeInfo;
    let datatypesIndex = this._datatypesIndices.get(datatypes);
    if (datatypesIndex == null) {
      datatypesIndex = this._numberOfDatatypesSent;
      this._datatypesIndices.set(datatypes, datatypesIndex);
      this._numberOfDatatypesSent += 1;
      await this._rpc.send("$$transferDatatypes", datatypes);
    }
    const binaryData = getBinaryData(message);
    if (binaryData == null) {
      // Reverse-wrapped bobject. Deep parse to transfer.
      const data = {
        action,
        topic,
        receiveTime,
        message: deepParse(message),
        datatype,
        datatypesIndex,
        additionalTransferables,
        type: "parsed",
      };
      return this._rpc.send<T>("$$transferBobject", data);
    }
    if (this._buffersByTopic[topic] !== binaryData.buffer) {
      await this._rpc.send("$$transferBuffer", { buffer: binaryData.buffer, bigString: binaryData.bigString, topic });
      this._buffersByTopic[topic] = binaryData.buffer;
    }
    const data = {
      action,
      topic,
      receiveTime,
      datatype,
      datatypesIndex,
      offset: binaryData.offset,
      additionalTransferables,
      type: "binary",
    };
    return this._rpc.send<T>("$$transferBobject", data);
  }
}

export class BobjectRpcReceiver {
  _rpc: Rpc;
  _datatypes: RosDatatypes[] = [];
  _buffersByTopic: { [topic: string]: $ReadOnly<{| buffer: ArrayBuffer, bigString: string |}> } = {};
  _receiveFunctions: { [action: string]: (TransferData) => Promise<any> } = {};

  constructor(rpc: Rpc) {
    this._rpc = rpc;
    rpc.receive("$$transferDatatypes", async (datatypes) => {
      this._datatypes.push(datatypes);
    });
    rpc.receive("$$transferBuffer", async ({ topic, buffer, bigString }) => {
      this._buffersByTopic[topic] = { buffer, bigString };
    });
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
      const message = this._formatMessage(format, transferData);
      return callback(
        { topic: transferData.topic, receiveTime: transferData.receiveTime, message },
        transferData.additionalTransferables
      );
    };
  }

  _formatMessage(format: "parsed" | "bobject", transferData: TransferData) {
    if (format === "parsed" && transferData.type === "parsed") {
      return transferData.message;
    }
    // Need to make a bobject.
    const { datatypesIndex, datatype, topic } = transferData;
    const bobject =
      transferData.type === "parsed"
        ? wrapJsObject(this._datatypes[datatypesIndex], datatype, transferData.message)
        : getObjects(
            this._datatypes[datatypesIndex],
            datatype,
            this._buffersByTopic[topic].buffer,
            this._buffersByTopic[topic].bigString,
            [transferData.offset]
          )[0];
    return format === "parsed" ? deepParse(bobject) : bobject;
  }
}
