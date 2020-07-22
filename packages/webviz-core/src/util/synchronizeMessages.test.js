// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import synchronizeMessages, { getSynchronizingReducers } from "./synchronizeMessages";

function message(topic, stamp) {
  return {
    topic,
    receiveTime: { sec: 0, nsec: 0 },
    message: { header: { stamp } },
  };
}

function item(topic, stamp) {
  return {
    message: message(topic, stamp),
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

    expect(
      synchronizeMessages(
        {
          "/foo": [item("/foo", { sec: 1, nsec: 2 })],
        },
        () => null
      )
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

describe("getSynchronizingReducers", () => {
  it("restores all existing messages on the requested topics", () => {
    const { restore } = getSynchronizingReducers(["/a", "/b"]);

    expect(restore(undefined)).toEqual({
      messagesByTopic: {
        "/a": [],
        "/b": [],
      },
      synchronizedMessages: null,
    });

    expect(
      restore({
        messagesByTopic: {
          "/a": [message("/a", { sec: 1, nsec: 0 }), message("/a", { sec: 2, nsec: 0 })],
          "/c": [message("/c", { sec: 1, nsec: 0 })],
        },
        synchronizedMessages: null,
      })
    ).toEqual({
      messagesByTopic: {
        "/a": [message("/a", { sec: 1, nsec: 0 }), message("/a", { sec: 2, nsec: 0 })],
        "/b": [],
      },
      synchronizedMessages: null,
    });
  });

  it("restores synchronized messages, removing old unneeded messages", () => {
    const { restore } = getSynchronizingReducers(["/a", "/b"]);
    expect(
      restore({
        messagesByTopic: {
          "/a": [message("/a", { sec: 1, nsec: 0 }), message("/a", { sec: 2, nsec: 0 })],
          "/b": [message("/b", { sec: 2, nsec: 0 })],
          "/c": [message("/c", { sec: 1, nsec: 0 })],
        },
        synchronizedMessages: null,
      })
    ).toEqual({
      messagesByTopic: {
        "/a": [message("/a", { sec: 2, nsec: 0 })],
        "/b": [message("/b", { sec: 2, nsec: 0 })],
      },
      synchronizedMessages: {
        "/a": message("/a", { sec: 2, nsec: 0 }),
        "/b": message("/b", { sec: 2, nsec: 0 }),
      },
    });
  });

  it("keeps old messages when adding a new ones if stamps don't match", () => {
    const { addMessage } = getSynchronizingReducers(["/a", "/b"]);
    expect(
      addMessage(
        {
          messagesByTopic: {
            "/a": [message("/a", { sec: 1, nsec: 0 })],
            "/b": [message("/b", { sec: 2, nsec: 0 })],
          },
          synchronizedMessages: null,
        },
        message("/a", { sec: 3, nsec: 0 })
      )
    ).toEqual({
      messagesByTopic: {
        "/a": [message("/a", { sec: 1, nsec: 0 }), message("/a", { sec: 3, nsec: 0 })],
        "/b": [message("/b", { sec: 2, nsec: 0 })],
      },
      synchronizedMessages: null,
    });
  });

  it("synchronizes when adding a new message, removing old unneeded messages", () => {
    const { addMessage } = getSynchronizingReducers(["/a", "/b"]);
    expect(
      addMessage(
        {
          messagesByTopic: {
            "/a": [message("/a", { sec: 1, nsec: 0 })],
            "/b": [message("/b", { sec: 2, nsec: 0 })],
          },
          synchronizedMessages: null,
        },
        message("/a", { sec: 2, nsec: 0 })
      )
    ).toEqual({
      messagesByTopic: {
        "/a": [message("/a", { sec: 2, nsec: 0 })],
        "/b": [message("/b", { sec: 2, nsec: 0 })],
      },
      synchronizedMessages: {
        "/a": message("/a", { sec: 2, nsec: 0 }),
        "/b": message("/b", { sec: 2, nsec: 0 }),
      },
    });
  });
});
