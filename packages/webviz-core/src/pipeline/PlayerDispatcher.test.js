// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { Time } from "rosbag";

import PlayerDispatcher from "./PlayerDispatcher";
import type { Message } from "webviz-core/src/types/players";

const dummyReceiveTime: Time = { sec: 123, nsec: 456 };

// makes a message shape
export const makeMessage = (topic: string, message: any): Message => ({
  op: "message",
  topic,
  datatype: topic,
  message,
  receiveTime: dummyReceiveTime,
});

describe("PlayerDispatcher", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  it("emits single message as it comes in", async () => {
    const dispatch = jest.fn();
    const dispatcher = new PlayerDispatcher(dispatch);
    const msg = makeMessage("/foo", { data: true });
    dispatcher.consumeMessage(msg);
    jest.runAllTimers();
    expect(dispatch.mock.calls).toEqual([
      [{ type: "FRAME_RECEIVED", currentTime: dummyReceiveTime, frame: { "/foo": [msg] } }],
    ]);
  });

  it("consumes multiple messages across topics", async () => {
    const dispatch = jest.fn();
    const dispatcher = new PlayerDispatcher(dispatch);
    const msg1 = makeMessage("/foo", { data: true });
    const msg2 = makeMessage("/foo", { data: false });
    const msg3 = makeMessage("/bar", { data: "baz" });
    dispatcher.consumeMessage(msg1);
    dispatcher.consumeMessage(msg2);
    dispatcher.consumeMessage(msg3);
    jest.runAllTimers();
    expect(dispatch.mock.calls).toEqual([
      [{ type: "FRAME_RECEIVED", currentTime: dummyReceiveTime, frame: { "/foo": [msg1, msg2], "/bar": [msg3] } }],
    ]);
  });

  describe("receiveTime support", () => {
    it("translates message receiveTime to frame time", async () => {
      const dispatch = jest.fn();
      const dispatcher = new PlayerDispatcher(dispatch);
      const receiveTime = { sec: 42, nsec: 53 };
      const msg = { ...makeMessage("/foo", { data: true }), receiveTime };
      dispatcher.consumeMessage(msg);
      jest.runAllTimers();
      expect(dispatch.mock.calls).toEqual([
        [
          {
            type: "FRAME_RECEIVED",
            frame: { "/foo": [msg] },
            currentTime: receiveTime,
          },
        ],
      ]);
    });

    it("combines update_time with frame", async () => {
      const dispatch = jest.fn();
      const dispatcher = new PlayerDispatcher(dispatch);
      const msg = { ...makeMessage("/foo", { data: true }) };
      dispatcher.consumeMessage(msg);
      const time = { sec: 42, nsec: 53 };
      dispatcher.consumeMessage({ op: "update_time", time });
      jest.runAllTimers();
      expect(dispatch.mock.calls).toEqual([
        [
          {
            type: "FRAME_RECEIVED",
            frame: { "/foo": [msg] },
            currentTime: time,
          },
        ],
      ]);
    });

    it("sends TIME_UPDATED if there is no frame", async () => {
      const dispatch = jest.fn();
      const dispatcher = new PlayerDispatcher(dispatch);
      const time = { sec: 42, nsec: 53 };
      dispatcher.consumeMessage({ op: "update_time", time });
      jest.runAllTimers();
      expect(dispatch.mock.calls).toEqual([[{ type: "TIME_UPDATED", time }]]);
    });
  });
});
