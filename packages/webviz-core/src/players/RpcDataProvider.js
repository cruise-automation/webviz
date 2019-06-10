// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { Time } from "rosbag";

import {
  type ChainableDataProviderDescriptor,
  type ExtensionPoint,
  type InitializationResult,
  type MessageLike,
  type RandomAccessDataProvider,
} from "webviz-core/src/players/types";
import Rpc from "webviz-core/src/util/Rpc";

export default class RpcDataProvider implements RandomAccessDataProvider {
  _rpc: Rpc;
  _childDescriptor: ChainableDataProviderDescriptor;

  constructor(rpc: Rpc, childDescriptor: ChainableDataProviderDescriptor) {
    this._rpc = rpc;
    this._childDescriptor = childDescriptor;
  }

  initialize(extensionPoint: ExtensionPoint): Promise<InitializationResult> {
    if (extensionPoint) {
      const { progressCallback, addTopicsCallback, reportMetadataCallback } = extensionPoint;

      this._rpc.receive("extensionPointCallback", ({ type, data }) => {
        switch (type) {
          case "progressCallback":
            progressCallback(data);
            break;
          case "addTopicsCallback":
            addTopicsCallback((topics: string[]) => {
              this._rpc.send(data.rpcCommand, topics);
            });
            break;
          case "reportMetadataCallback":
            reportMetadataCallback(data);
            break;
          default:
            throw new Error(`Unsupported extension point type in RpcDataProvider: ${type}`);
        }
      });
    }
    return this._rpc.send("initialize", { childDescriptor: this._childDescriptor });
  }

  async getMessages(start: Time, end: Time, topics: string[]): Promise<MessageLike[]> {
    return (await this._rpc.send("getMessages", { start, end, topics })).messages;
  }

  close(): Promise<void> {
    return this._rpc.send("close");
  }
}
