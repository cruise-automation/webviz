// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { getMessagesWithoutPrefix } from "./topicPrefixUtils";

const messagesA = [
  {
    topic: "topicA/abc",
    datatype: "/some/datatype/a",
    op: "message",
    receiveTime: { sec: 123, nsec: 456 },
    message: {
      foo: "bar",
    },
  },
];
const messagesB = [
  {
    topic: "topicB/def",
    datatype: "/some/datatype/b",
    op: "message",
    receiveTime: { sec: 123, nsec: 456 },
    message: {
      foo: "baz",
    },
  },
];
const topicPrefixA = "topicA/";
const topicPrefixB = "topicB/";

describe("getMessagesWithoutPrefix", () => {
  it("strips out appropriate topicPrefixes", () => {
    const msgsAWithoutPrefixA = getMessagesWithoutPrefix(messagesA, topicPrefixA);
    const msgsBWithoutPrefixB = getMessagesWithoutPrefix(messagesB, topicPrefixB);

    expect(msgsAWithoutPrefixA[0]).toEqual({ ...messagesA[0], topic: "abc" });
    expect(msgsBWithoutPrefixB[0]).toEqual({ ...messagesB[0], topic: "def" });
  });

  it("filters out appropriate topicPrefixes", () => {
    const msgsAWithoutPrefixB = getMessagesWithoutPrefix(messagesA, topicPrefixB);
    const msgsBWithoutPrefixA = getMessagesWithoutPrefix(messagesB, topicPrefixA);

    expect(msgsAWithoutPrefixB).toEqual([]);
    expect(msgsBWithoutPrefixA).toEqual([]);
  });

  it("remembers previous messages when just topicPrefix changes", () => {
    const prevMessages = getMessagesWithoutPrefix(messagesA, topicPrefixA);
    getMessagesWithoutPrefix(messagesA, topicPrefixB);
    const nextMessages = getMessagesWithoutPrefix(messagesA, topicPrefixA);
    expect(prevMessages).toBe(nextMessages);
  });

  it("does not remember previous messages when messages change", () => {
    const prevMessages = getMessagesWithoutPrefix(messagesA, topicPrefixA);
    getMessagesWithoutPrefix(messagesB, topicPrefixA);
    const nextMessages = getMessagesWithoutPrefix(messagesA, topicPrefixA);
    expect(prevMessages).not.toBe(nextMessages);
  });

  it("does not remember previous messages when messages and topicPrefixchange", () => {
    const prevMessages = getMessagesWithoutPrefix(messagesA, topicPrefixA);
    const nextMessages = getMessagesWithoutPrefix(messagesB, topicPrefixB);
    expect(prevMessages).not.toBe(nextMessages);
  });
});
