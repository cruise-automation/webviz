// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { DataProvider, DataProviderDescriptor, DataProviderMetadata } from "webviz-core/src/dataProviders/types";
import Rpc from "webviz-core/src/util/Rpc";
import { setupWorker } from "webviz-core/src/util/RpcUtils";

// The "other side" of `RpcDataProvider`. Instantiates a `DataProviderDescriptor` tree underneath,
// in the context of wherever this is instantiated (e.g. a Web Worker, or the server side of a
// WebSocket).
export default class RpcDataProviderRemote {
  constructor(rpc: Rpc, getDataProvider: (DataProviderDescriptor) => DataProvider) {
    setupWorker(rpc);
    let provider: DataProvider;
    rpc.receive("initialize", async ({ childDescriptor }) => {
      provider = getDataProvider(childDescriptor);
      return provider.initialize({
        progressCallback: (data) => {
          rpc.send("extensionPointCallback", { type: "progressCallback", data });
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
