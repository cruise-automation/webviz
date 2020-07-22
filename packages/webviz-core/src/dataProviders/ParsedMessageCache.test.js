// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { MessageReader, parseMessageDefinition } from "rosbag";

import BagDataProvider from "webviz-core/src/dataProviders/BagDataProvider";
import ParsedMessageCache, { CACHE_SIZE_BYTES } from "webviz-core/src/dataProviders/ParsedMessageCache";

describe("parsedMessageCache", () => {
  it("does some basic caching of messages", async () => {
    const file = `${__dirname}/../../public/fixtures/example.bag`;
    const provider = new BagDataProvider({ bagPath: { type: "file", file } }, []);
    const { messageDefinitionsByTopic } = await provider.initialize({
      progressCallback() {},
      reportMetadataCallback() {},
    });
    const tfDefinition = messageDefinitionsByTopic["/tf"];
    // the tf definition is always a string since it comes from the bag, but we do this to satisfy flow.
    const parsedTfDefinition = typeof tfDefinition === "string" ? parseMessageDefinition(tfDefinition) : tfDefinition;
    const messageReadersByTopic = {
      "/tf": new MessageReader(parsedTfDefinition),
    };
    const start = { sec: 1396293887, nsec: 844783943 };
    const end = { sec: 1396293888, nsec: 60000000 };
    const messages = await provider.getMessages(start, end, ["/tf"]);

    const cache = new ParsedMessageCache();
    const parsedMessages1 = cache.parseMessages(messages, messageReadersByTopic);
    const parsedMessages2 = cache.parseMessages(messages, messageReadersByTopic);
    expect(parsedMessages1[0]).toBe(parsedMessages2[0]);
    expect(parsedMessages1[1]).toBe(parsedMessages2[1]);
  });

  it("evicts parsed messages based on original message size", async () => {
    const smallMessage = { topic: "/some_topic", receiveTime: { sec: 100, nsec: 0 }, message: new ArrayBuffer(10) };
    const bigMessage = {
      topic: "/some_topic",
      receiveTime: { sec: 105, nsec: 0 },
      message: new ArrayBuffer(CACHE_SIZE_BYTES + 1),
    };
    const messageReadersByTopic = { "/some_topic": new MessageReader(parseMessageDefinition("")) };

    const cache = new ParsedMessageCache();
    const [parsedSmallMessage1] = cache.parseMessages([smallMessage], messageReadersByTopic);
    const [parsedSmallMessage2] = cache.parseMessages([smallMessage], messageReadersByTopic);
    cache.parseMessages([bigMessage], messageReadersByTopic);
    const [parsedSmallMessage3] = cache.parseMessages([smallMessage], messageReadersByTopic);
    expect(parsedSmallMessage1).toBe(parsedSmallMessage2);
    expect(parsedSmallMessage1).not.toBe(parsedSmallMessage3);
  });
});
