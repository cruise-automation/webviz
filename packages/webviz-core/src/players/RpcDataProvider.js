// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { Time } from "rosbag";

import {
  type DataProviderDescriptor,
  type ExtensionPoint,
  type InitializationResult,
  type MessageLike,
  type RandomAccessDataProvider,
} from "webviz-core/src/players/types";
import reportError from "webviz-core/src/util/reportError";
import Rpc from "webviz-core/src/util/Rpc";

export default class RpcDataProvider implements RandomAccessDataProvider {
  _rpc: Rpc;
  _childDescriptor: DataProviderDescriptor;

  constructor(rpc: Rpc, children: DataProviderDescriptor[]) {
    this._rpc = rpc;
    this._rpc.receive("reportError", ({ message, details, type }) => {
      reportError(message, details, type);
    });
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

  async getMessages(start: Time, end: Time, topics: string[]): Promise<MessageLike[]> {
    return (await this._rpc.send("getMessages", { start, end, topics })).messages;
  }

  close(): Promise<void> {
    return this._rpc.send("close");
  }
}
