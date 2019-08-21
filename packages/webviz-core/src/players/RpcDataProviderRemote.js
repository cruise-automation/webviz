// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type {
  RandomAccessDataProvider,
  DataProviderDescriptor,
  DataProviderMetadata,
} from "webviz-core/src/players/types";
import { type DetailsType, type ErrorType, setErrorHandler } from "webviz-core/src/util/reportError";
import Rpc from "webviz-core/src/util/Rpc";

export default class RpcDataProviderRemote {
  constructor(rpc: Rpc, getDataProvider: (DataProviderDescriptor) => RandomAccessDataProvider) {
    let provider: RandomAccessDataProvider;
    if (process.env.NODE_ENV !== "test") {
      setErrorHandler((message: string, details: DetailsType, type: ErrorType) => {
        rpc.send("reportError", {
          message,
          details: details instanceof Error ? details.toString() : JSON.stringify(details),
          type,
        });
      });
    }
    rpc.receive("initialize", async ({ childDescriptor, hasExtensionPoint }) => {
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
