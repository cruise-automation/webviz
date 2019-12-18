// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { MessageReader } from "rosbag";

import MessageReaderStore from "./MessageReaderStore";

describe("MessageReaderStore", () => {
  it("returns message reader for connection", () => {
    const store = new MessageReaderStore();
    const reader = store.get("/topic", "foo", "");
    expect(reader).toBeInstanceOf(MessageReader);
  });

  it("returns the same reader for the same md5", () => {
    const store = new MessageReaderStore();
    const reader = store.get("/topic", "foo", "");
    expect(reader).toBeInstanceOf(MessageReader);
    const reader2 = store.get("/topic", "foo", "bar");
    expect(reader2).toBeInstanceOf(MessageReader);
    expect(reader).toBe(reader2);
  });

  it("returns a new reader if the md5 changes", () => {
    const store = new MessageReaderStore();
    const reader = store.get("/standard_msg/topic", "foo", "");
    expect(reader).toBeInstanceOf(MessageReader);
    const reader2 = store.get("/standard_msg/topic", "bar", "");
    expect(reader2).toBeInstanceOf(MessageReader);
    expect(reader).not.toBe(reader2);
  });

  it("returns different reader for different type", () => {
    const store = new MessageReaderStore();
    const reader = store.get("/standard_msg/foo", "foo", "");
    expect(reader).toBeInstanceOf(MessageReader);
    const reader2 = store.get("/standard_msg/bar", "foo", "");
    expect(reader2).toBeInstanceOf(MessageReader);
    expect(reader).not.toBe(reader2);
  });

  it("purges old readers", () => {
    const store = new MessageReaderStore();
    const reader = store.get("/standard_msg/foo", "foo", "");
    expect(reader).toBeInstanceOf(MessageReader);
    const reader2 = store.get("/standard_msg/foo", "bar", "");
    expect(reader2).toBeInstanceOf(MessageReader);
    expect(reader).not.toBe(reader2);
    expect(Object.keys(store.storage)).toHaveLength(1);
  });
});
