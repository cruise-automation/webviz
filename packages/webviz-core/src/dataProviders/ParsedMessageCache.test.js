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
import { cast } from "webviz-core/src/players/types";
import type { BinaryHeader } from "webviz-core/src/types/BinaryMessages";
import { getObject, wrapJsObject } from "webviz-core/src/util/binaryObjects";
import { definitions } from "webviz-core/src/util/binaryObjects/messageDefinitionUtils.test";

describe("parsedMessageCache", () => {
  it("does some basic caching of messages", async () => {
    const file = `${__dirname}/../../public/fixtures/example.bag`;
    const provider = new BagDataProvider({ bagPath: { type: "file", file } }, []);
    const { messageDefinitions } = await provider.initialize({
      progressCallback() {},
      reportMetadataCallback() {},
    });
    if (messageDefinitions.type !== "raw") {
      throw new Error("BagDataProvider should have raw message definitions");
    }
    const tfDefinition = messageDefinitions.messageDefinitionsByTopic["/tf"];
    const parsedTfDefinition = parseMessageDefinition(tfDefinition);
    const messageReadersByTopic = {
      "/tf": new MessageReader(parsedTfDefinition),
    };
    const start = { sec: 1396293887, nsec: 844783943 };
    const end = { sec: 1396293888, nsec: 60000000 };
    const { rosBinaryMessages } = await provider.getMessages(start, end, { rosBinaryMessages: ["/tf"] });
    if (rosBinaryMessages == null) {
      throw new Error("Satisfy flow");
    }

    const cache = new ParsedMessageCache();
    const parsedMessages1 = cache.parseMessages(rosBinaryMessages, messageReadersByTopic);
    const parsedMessages2 = cache.parseMessages(rosBinaryMessages, messageReadersByTopic);
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

  it("evicts parsed bobjects based on original message size", async () => {
    const smallMessage = {
      topic: "/some_topic",
      receiveTime: { sec: 100, nsec: 0 },
      message: getObject({}, "time", new ArrayBuffer(10), ""),
    };
    const bigMessage = {
      topic: "/some_topic",
      receiveTime: { sec: 105, nsec: 0 },
      message: getObject({}, "time", new ArrayBuffer(CACHE_SIZE_BYTES + 1), ""),
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

  it("can parse bobjects", async () => {
    const binaryHeader = getObject(definitions, "std_msgs/Header", new ArrayBuffer(100), "");
    // Looks like a binary object:
    expect(cast<BinaryHeader>(binaryHeader).frame_id()).toBe("");
    const binaryMessage = {
      topic: "/some_topic",
      receiveTime: { sec: 105, nsec: 0 },
      message: binaryHeader,
    };

    const messageReadersByTopic = { "/some_topic": new MessageReader(parseMessageDefinition("")) };
    const cache = new ParsedMessageCache();
    const [parsedMessage] = cache.parseMessages([binaryMessage], messageReadersByTopic);
    expect(parsedMessage).toEqual({
      topic: "/some_topic",
      receiveTime: { sec: 105, nsec: 0 },
      message: {
        stamp: { sec: 0, nsec: 0 },
        frame_id: "",
        seq: 0,
      },
    });
  });

  it("can parse reverse-wrapped objects", async () => {
    const wrappedHeader = wrapJsObject(definitions, "std_msgs/Header", {
      stamp: { sec: 0, nsec: 0 },
      seq: 0,
      frame_id: "",
    });
    // Looks like a binary object:
    expect(cast<BinaryHeader>(wrappedHeader).frame_id()).toBe("");
    const wrappedMessage = {
      topic: "/some_topic",
      receiveTime: { sec: 105, nsec: 0 },
      message: wrappedHeader,
    };

    const messageReadersByTopic = { "/some_topic": new MessageReader(parseMessageDefinition("")) };
    const cache = new ParsedMessageCache();
    const [parsedMessage] = cache.parseMessages([wrappedMessage], messageReadersByTopic);
    expect(parsedMessage).toEqual({
      topic: "/some_topic",
      receiveTime: { sec: 105, nsec: 0 },
      message: {
        stamp: { sec: 0, nsec: 0 },
        frame_id: "",
        seq: 0,
      },
    });
  });
});
