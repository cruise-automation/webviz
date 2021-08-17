// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import synchronizeMessages, { getSynchronizingReducers } from "./synchronizeMessages";
import { wrapMessage } from "webviz-core/src/test/datatypes";
import { deepParse } from "webviz-core/src/util/binaryObjects";

function message(topic, stamp) {
  return {
    topic,
    receiveTime: { sec: 0, nsec: 0 },
    message: { header: { stamp } },
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
        "/foo": [message("/foo", undefined)],
      })
    ).toEqual(null);

    expect(
      synchronizeMessages(
        {
          "/foo": [message("/foo", { sec: 1, nsec: 2 })],
        },
        () => null
      )
    ).toEqual(null);
  });

  it("works with single message", () => {
    const itemsByPath = {
      "/foo": [message("/foo", { sec: 1, nsec: 2 })],
    };
    expect(synchronizeMessages(itemsByPath)).toEqual(itemsByPath);
  });

  it("works with multiple messages", () => {
    const itemsByPath = {
      "/foo": [message("/foo", { sec: 1, nsec: 0 })],
      "/bar": [message("/bar", { sec: 1, nsec: 0 })],
      "/baz": [message("/baz", { sec: 1, nsec: 0 })],
    };
    expect(synchronizeMessages(itemsByPath)).toEqual(itemsByPath);
  });

  it("returns nothing for different stamps and missing messages", () => {
    expect(
      synchronizeMessages({
        "/foo": [message("/foo", { sec: 1, nsec: 0 })],
        "/bar": [message("/bar", { sec: 2, nsec: 0 })],
      })
    ).toBeNull();

    expect(
      synchronizeMessages({
        "/foo": [message("/foo", { sec: 1, nsec: 0 })],
        "/bar": [message("/bar", { sec: 1, nsec: 0 })],
        "/baz": [],
      })
    ).toBeNull();
  });

  it("returns latest of multiple matches regardless of order", () => {
    expect(
      synchronizeMessages({
        "/foo": [message("/foo", { sec: 1, nsec: 0 }), message("/foo", { sec: 2, nsec: 0 })],
        "/bar": [
          message("/bar", { sec: 2, nsec: 0 }),
          message("/bar", { sec: 0, nsec: 0 }),
          message("/bar", { sec: 1, nsec: 0 }),
        ],
      })
    ).toEqual({
      "/foo": [message("/foo", { sec: 2, nsec: 0 })],
      "/bar": [message("/bar", { sec: 2, nsec: 0 })],
    });
  });
});

const bobject = (topic, stamp) => wrapMessage(message(topic, stamp));

const parseMessage = ({ message: m, topic, receiveTime }) => ({ message: deepParse(m), topic, receiveTime });

const parseState = ({ messagesByTopic, synchronizedMessages }) => {
  const newMessagesByTopic = {};
  Object.keys(messagesByTopic).forEach((topic) => {
    newMessagesByTopic[topic] = messagesByTopic[topic].map(parseMessage);
  });
  if (synchronizedMessages == null) {
    return { messagesByTopic: newMessagesByTopic, synchronizedMessages };
  }
  const newSynchronizedMessages = {};
  Object.keys(synchronizedMessages).forEach((topic) => {
    newSynchronizedMessages[topic] = parseMessage(synchronizedMessages[topic]);
  });
  return { messagesByTopic: newMessagesByTopic, synchronizedMessages: newSynchronizedMessages };
};
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
      parseState(
        restore({
          messagesByTopic: {
            "/a": [bobject("/a", { sec: 1, nsec: 0 }), bobject("/a", { sec: 2, nsec: 0 })],
            "/c": [bobject("/c", { sec: 1, nsec: 0 })],
          },
          synchronizedMessages: null,
        })
      )
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
      parseState(
        restore({
          messagesByTopic: {
            "/a": [bobject("/a", { sec: 1, nsec: 0 }), bobject("/a", { sec: 2, nsec: 0 })],
            "/b": [bobject("/b", { sec: 2, nsec: 0 })],
            "/c": [bobject("/c", { sec: 1, nsec: 0 })],
          },
          synchronizedMessages: null,
        })
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

  it("keeps old messages when adding a new ones if stamps don't match", () => {
    const { addBobjects } = getSynchronizingReducers(["/a", "/b"]);
    expect(
      parseState(
        addBobjects(
          {
            messagesByTopic: {
              "/a": [bobject("/a", { sec: 1, nsec: 0 })],
              "/b": [bobject("/b", { sec: 2, nsec: 0 })],
            },
            synchronizedMessages: null,
          },
          [bobject("/a", { sec: 3, nsec: 0 })]
        )
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
    const { addBobjects } = getSynchronizingReducers(["/a", "/b"]);
    expect(
      parseState(
        addBobjects(
          {
            messagesByTopic: {
              "/a": [bobject("/a", { sec: 1, nsec: 0 })],
              "/b": [bobject("/b", { sec: 2, nsec: 0 })],
            },
            synchronizedMessages: null,
          },
          [bobject("/a", { sec: 2, nsec: 0 })]
        )
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
