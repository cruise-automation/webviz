// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import Bag, { open } from "rosbag";
import decompress from "wasm-lz4";

import type { InitializeMessage, RawMessage, MessageRequest } from "./types";
import Rpc from "webviz-core/src/util/Rpc";

type GetMessagesResponse = {
  messages: RawMessage[],
};

class BagProviderWorker {
  _bag: Bag;
  constructor(rpc: Rpc) {
    rpc.receive("initialize", this.initialize);
    rpc.receive("getMessages", this.getMessages);
  }

  initialize = async (initialize: InitializeMessage): Promise<void> => {
    await decompress.isLoaded;
    this._bag = await open(initialize.bagPath);
  };

  getMessages = async (request: MessageRequest): Promise<GetMessagesResponse> => {
    const messages: RawMessage[] = [];
    const options = {
      topics: request.topics,
      startTime: request.start,
      endTime: request.end,
      noParse: true,
      decompress: {
        lz4: decompress,
      },
    };
    const transfers = new Set();
    const onMessage = (msg) => {
      const { data, topic, timestamp } = msg;
      const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.length);
      transfers.add(buffer);
      messages.push({
        topic,
        timestamp,
        buffer,
      });
    };
    await this._bag.readMessages(options, onMessage);
    return { messages, [Rpc.transferrables]: Array.from(transfers) };
  };
}

export { BagProviderWorker };

if (global.postMessage && !global.onmessage) {
  const rpc = new Rpc(global);
  new BagProviderWorker(rpc);
}
