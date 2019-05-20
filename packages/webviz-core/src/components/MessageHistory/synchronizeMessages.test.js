// @flow
//
//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import synchronizeMessages from "./synchronizeMessages";

function item(topic, stamp) {
  return {
    message: {
      topic,
      datatype: "Foo",
      op: "message",
      receiveTime: { sec: 0, nsec: 0 },
      message: { header: { stamp } },
    },
    queriedData: [],
  };
}

describe("synchronizeMessages", () => {
  it("returns nothing for empty frame", () => {
    expect(synchronizeMessages({})).toEqual(null);
    expect(synchronizeMessages({ "/foo": [] })).toEqual(null);
  });

  it("returns nothing for missing header", () => {
    expect(
      synchronizeMessages({
        "/foo": [item("/foo", undefined)],
      })
    ).toEqual(null);
  });

  it("works with single message", () => {
    const itemsByPath = {
      "/foo": [item("/foo", { sec: 1, nsec: 2 })],
    };
    expect(synchronizeMessages(itemsByPath)).toEqual(itemsByPath);
  });

  it("works with multiple messages", () => {
    const itemsByPath = {
      "/foo": [item("/foo", { sec: 1, nsec: 0 })],
      "/bar": [item("/bar", { sec: 1, nsec: 0 })],
      "/baz": [item("/baz", { sec: 1, nsec: 0 })],
    };
    expect(synchronizeMessages(itemsByPath)).toEqual(itemsByPath);
  });

  it("returns nothing for different stamps and missing messages", () => {
    expect(
      synchronizeMessages({
        "/foo": [item("/foo", { sec: 1, nsec: 0 })],
        "/bar": [item("/bar", { sec: 2, nsec: 0 })],
      })
    ).toBeNull();

    expect(
      synchronizeMessages({
        "/foo": [item("/foo", { sec: 1, nsec: 0 })],
        "/bar": [item("/bar", { sec: 1, nsec: 0 })],
        "/baz": [],
      })
    ).toBeNull();
  });

  it("returns latest of multiple matches regardless of order", () => {
    expect(
      synchronizeMessages({
        "/foo": [item("/foo", { sec: 1, nsec: 0 }), item("/foo", { sec: 2, nsec: 0 })],
        "/bar": [
          item("/bar", { sec: 2, nsec: 0 }),
          item("/bar", { sec: 0, nsec: 0 }),
          item("/bar", { sec: 1, nsec: 0 }),
        ],
      })
    ).toEqual({
      "/foo": [item("/foo", { sec: 2, nsec: 0 })],
      "/bar": [item("/bar", { sec: 2, nsec: 0 })],
    });
  });
});
