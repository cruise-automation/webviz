// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import uuid from "uuid";

import type {
  ChainableDataProvider,
  ChainableDataProviderDescriptor,
  DataProviderMetadata,
} from "webviz-core/src/players/types";
import Rpc from "webviz-core/src/util/Rpc";

export default class RpcDataProviderRemote {
  constructor(rpc: Rpc, getDataProvider: (ChainableDataProviderDescriptor) => ChainableDataProvider) {
    let provider: ChainableDataProvider;
    rpc.receive("initialize", async ({ childDescriptor, hasExtensionPoint }) => {
      provider = getDataProvider(childDescriptor);
      return provider.initialize({
        progressCallback: (data) => {
          rpc.send("extensionPointCallback", { type: "progressCallback", data });
        },
        addTopicsCallback: (fn: (string[]) => void) => {
          const rpcCommand = uuid.v4();
          rpc.receive(rpcCommand, fn);
          rpc.send("extensionPointCallback", { type: "addTopicsCallback", data: { rpcCommand } });
        },
        reportMetadataCallback: (data: DataProviderMetadata) => {
          rpc.send("extensionPointCallback", { type: "reportMetadataCallback", data });
        },
      });
    });
    rpc.receive("getMessages", async ({ start, end, topics }) => {
      const messages = await provider.getMessages(start, end, topics);
      const arrayBuffers = new Set();
      for (const message of messages) {
        if (!(message.message instanceof ArrayBuffer)) {
          throw new Error(
            "RpcDataProvider only accepts raw messages (that still need to be parsed with ParseMessagesDataProvider)"
          );
        }
        arrayBuffers.add(message.message);
      }
      return { messages, [Rpc.transferrables]: Array.from(arrayBuffers) };
    });
    rpc.receive("close", () => provider.close());
  }
}
