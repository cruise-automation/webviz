// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { Time } from "rosbag";

import type {
  DataProviderDescriptor,
  ExtensionPoint,
  GetMessagesResult,
  GetMessagesTopics,
  InitializationResult,
  DataProvider,
} from "webviz-core/src/dataProviders/types";
import Rpc from "webviz-core/src/util/Rpc";
import { setupMainThreadRpc } from "webviz-core/src/util/RpcMainThreadUtils";

// Looks a bit like a regular `DataProvider`, but is not intended to be used directly in a
// DataProviderDescriptor tree, but rather in another DataProvider where we instantiate an Rpc, e.g.
// in a WorkerDataProvider, or even over a WebSocket. It proxies any calls to the
// RpcDataProviderRemote, where we instantiate the rest of the DataProviderDescriptor tree.
// See WorkerDataProvider for an example.
export default class RpcDataProvider implements DataProvider {
  _rpc: Rpc;
  _childDescriptor: DataProviderDescriptor;

  constructor(rpc: Rpc, children: DataProviderDescriptor[]) {
    this._rpc = rpc;
    setupMainThreadRpc(this._rpc);
    if (children.length !== 1) {
      throw new Error(`RpcDataProvider requires exactly 1 child, but received ${children.length}`);
    }
    this._childDescriptor = children[0];
  }

  initialize(extensionPoint: ExtensionPoint): Promise<InitializationResult> {
    if (extensionPoint) {
      const { progressCallback, reportMetadataCallback } = extensionPoint;

      this._rpc.receive("extensionPointCallback", ({ type, data }) => {
        switch (type) {
          case "progressCallback":
            progressCallback(data);
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

  async getMessages(start: Time, end: Time, topics: GetMessagesTopics): Promise<GetMessagesResult> {
    if (topics.bobjects || topics.parsedMessages) {
      throw new Error("RpcDataProvider only supports rosBinaryMessages");
    }
    return {
      rosBinaryMessages: (await this._rpc.send("getMessages", { start, end, topics: topics.rosBinaryMessages }))
        .messages,
      bobjects: undefined,
      parsedMessages: undefined,
    };
  }

  close(): Promise<void> {
    return this._rpc.send("close");
  }
}
