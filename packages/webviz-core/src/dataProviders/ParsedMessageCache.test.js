// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import ParsedMessageCache, { CACHE_SIZE_BYTES } from "webviz-core/src/dataProviders/ParsedMessageCache";
import { cast } from "webviz-core/src/players/types";
import { wrapMessages } from "webviz-core/src/test/datatypes";
import type { BinaryHeader } from "webviz-core/src/types/BinaryMessages";
import { getObject, wrapJsObject } from "webviz-core/src/util/binaryObjects";
import { definitions } from "webviz-core/src/util/binaryObjects/testUtils";

const getMessagesWithByteSizes = (sizes: number[]) =>
  wrapMessages(
    sizes.map((bytes, i) => ({
      topic: "/t",
      receiveTime: { sec: i, nsec: 0 },
      // Arrays have an overhead of 4 bytes each for [length, offset]
      message: { u8Arr: new Uint8Array(bytes - 8) },
    }))
  );

describe("ParsedMessageCache", () => {
  it("does some basic caching of messages", async () => {
    const rosBinaryMessages = getMessagesWithByteSizes([100, 200]);

    const cache = new ParsedMessageCache();
    const parsedMessages1 = cache.parseMessages(rosBinaryMessages);
    const parsedMessages2 = cache.parseMessages(rosBinaryMessages);
    expect(parsedMessages1[0]).toBe(parsedMessages2[0]);
    expect(parsedMessages1[1]).toBe(parsedMessages2[1]);
  });

  it("evicts parsed messages based on original message size", async () => {
    const [smallMessage, bigMessage] = getMessagesWithByteSizes([10, CACHE_SIZE_BYTES + 1]);
    const cache = new ParsedMessageCache();
    const [parsedSmallMessage1] = cache.parseMessages([smallMessage]);
    const [parsedSmallMessage2] = cache.parseMessages([smallMessage]);
    cache.parseMessages([bigMessage]);
    const [parsedSmallMessage3] = cache.parseMessages([smallMessage]);
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
    const cache = new ParsedMessageCache();
    const [parsedSmallMessage1] = cache.parseMessages([smallMessage]);
    const [parsedSmallMessage2] = cache.parseMessages([smallMessage]);
    cache.parseMessages([bigMessage]);
    const [parsedSmallMessage3] = cache.parseMessages([smallMessage]);
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
    const cache = new ParsedMessageCache();
    const [parsedMessage] = cache.parseMessages([binaryMessage]);
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

    const cache = new ParsedMessageCache();
    const [parsedMessage] = cache.parseMessages([wrappedMessage]);
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
