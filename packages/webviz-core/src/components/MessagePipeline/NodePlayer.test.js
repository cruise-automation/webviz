// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import NodePlayer from "./NodePlayer";
import FakePlayer from "webviz-core/src/components/MessagePipeline/FakePlayer";
import signal from "webviz-core/src/util/signal";

const node = {
  name: "foo",
  inputs: ["/input/foo", "/input/bar"],
  outputs: [{ name: "/webviz/test", datatype: "test" }],
  datatypes: {
    test: [{ type: "string", name: "foo" }],
  },
  defaultState: { callCount: 0 },
  callback: ({ message, state }) => {
    const callCount = state.callCount + 1;
    return {
      messages: [
        {
          op: "message",
          topic: "/webviz/test",
          datatype: "test",
          receiveTime: message.receiveTime,
          message: {
            ...message.message,
            callCount,
          },
        },
      ],
      state: { callCount },
    };
  },
};

describe("NodePlayer", () => {
  it("combines topics and datatypes with underlying player datatypes", () => {
    const fakePlayer = new FakePlayer();
    const nodePlayer = new NodePlayer(fakePlayer, [node]);
    const messages = [];
    nodePlayer.setListener(async (playerState) => {
      messages.push(playerState);
    });
    fakePlayer.emit({
      messages: [],
      currentTime: { sec: 0, nsec: 0 },
      startTime: { sec: 0, nsec: 0 },
      endTime: { sec: 1, nsec: 0 },
      isPlaying: true,
      speed: 0.2,
      lastSeekTime: 0,
      topics: [{ name: "/input/foo", datatype: "foo" }],
      datatypes: { foo: [] },
    });
    expect(messages).toHaveLength(1);
    const activeData = messages[0].activeData;
    expect(activeData).not.toBeUndefined();
    if (!activeData) {
      throw new Error("satisfy flow");
    }
    expect(activeData.datatypes).toEqual({
      test: [{ type: "string", name: "foo" }],
      foo: [],
    });
    expect(activeData.topics).toEqual([
      {
        name: "/input/foo",
        datatype: "foo",
      },
      {
        name: "/webviz/test",
        datatype: "test",
      },
    ]);
  });

  it("subscribes to underlying topics when node topics are subscribed", () => {
    const fakePlayer = new FakePlayer();
    jest.spyOn(fakePlayer, "setSubscriptions");
    const nodePlayer = new NodePlayer(fakePlayer, [node]);
    const messages = [];
    nodePlayer.setListener(async (playerState) => {
      messages.push(playerState);
    });
    nodePlayer.setSubscriptions([{ topic: "/webviz/test" }, { topic: "/input/baz" }]);
    expect(fakePlayer.setSubscriptions.mock.calls).toEqual([
      [
        [
          { topic: "/input/baz" },
          { requester: { name: "foo", type: "node" }, topic: "/input/foo" },
          { requester: { name: "foo", type: "node" }, topic: "/input/bar" },
        ],
      ],
    ]);
  });

  it("delegates play and pause calls to underlying player", () => {
    const fakePlayer = new FakePlayer();
    jest.spyOn(fakePlayer, "startPlayback");
    jest.spyOn(fakePlayer, "pausePlayback");
    const nodePlayer = new NodePlayer(fakePlayer, [node]);
    const messages = [];
    nodePlayer.setListener(async (playerState) => {
      messages.push(playerState);
    });
    expect(fakePlayer.startPlayback).not.toHaveBeenCalled();
    expect(fakePlayer.pausePlayback).not.toHaveBeenCalled();
    nodePlayer.startPlayback();
    expect(fakePlayer.startPlayback).toHaveBeenCalled();
    expect(fakePlayer.pausePlayback).not.toHaveBeenCalled();
    nodePlayer.pausePlayback();
    expect(fakePlayer.startPlayback).toHaveBeenCalled();
    expect(fakePlayer.pausePlayback).toHaveBeenCalled();
  });

  it("delegates setPlaybackSpeed to underlying player", () => {
    const fakePlayer = new FakePlayer();
    jest.spyOn(fakePlayer, "setPlaybackSpeed");
    const nodePlayer = new NodePlayer(fakePlayer, [node]);
    const messages = [];
    nodePlayer.setListener(async (playerState) => {
      messages.push(playerState);
    });
    expect(fakePlayer.setPlaybackSpeed).not.toHaveBeenCalled();
    nodePlayer.setPlaybackSpeed(0.4);
    expect(fakePlayer.setPlaybackSpeed).toHaveBeenCalledWith(0.4);
  });

  it("delegates seekPlayback to underlying player", () => {
    const fakePlayer = new FakePlayer();
    jest.spyOn(fakePlayer, "seekPlayback");
    const nodePlayer = new NodePlayer(fakePlayer, [node]);
    const messages = [];
    nodePlayer.setListener(async (playerState) => {
      messages.push(playerState);
    });
    expect(fakePlayer.seekPlayback).not.toHaveBeenCalled();
    nodePlayer.seekPlayback({ sec: 2, nsec: 2 });
    expect(fakePlayer.seekPlayback).toHaveBeenCalledWith({ sec: 2, nsec: 2 });
  });

  it("delegates publishing to underlying player", () => {
    const fakePlayer = new FakePlayer();
    jest.spyOn(fakePlayer, "setPublishers");
    jest.spyOn(fakePlayer, "publish");
    const nodePlayer = new NodePlayer(fakePlayer, [node]);
    expect(fakePlayer.setPublishers).not.toHaveBeenCalled();
    expect(fakePlayer.publish).not.toHaveBeenCalled();
    const publishers = [{ topic: "/foo", datatype: "foo" }];
    nodePlayer.setPublishers(publishers);
    expect(fakePlayer.setPublishers).toHaveBeenLastCalledWith(publishers);
    expect(fakePlayer.publish).not.toHaveBeenCalled();
    const publishPayload = { topic: "/foo", msg: {} };
    nodePlayer.publish(publishPayload);
    expect(fakePlayer.publish).toHaveBeenCalledWith(publishPayload);
  });

  const upstreamMessages = [
    {
      topic: "/input/foo",
      datatype: "foo",
      op: "message",
      receiveTime: { sec: 0, nsec: 1 },
      message: {
        payload: "bar",
      },
    },
    {
      topic: "/input/foo",
      datatype: "foo",
      op: "message",
      receiveTime: { sec: 0, nsec: 100 },
      message: {
        payload: "baz",
      },
    },
  ];

  it("invokes nodes with messages produced from underlying player", async () => {
    const fakePlayer = new FakePlayer();
    const nodePlayer = new NodePlayer(fakePlayer, [node]);
    const messages = [];
    const done = signal();
    nodePlayer.setListener(async (playerState) => {
      const incommingMessages = (playerState.activeData || {}).messages || [];
      if (incommingMessages.length) {
        messages.push(...incommingMessages);
        done.resolve();
      }
    });
    fakePlayer.emit({
      messages: upstreamMessages,
      currentTime: upstreamMessages[0].receiveTime,
      startTime: { sec: 0, nsec: 0 },
      endTime: { sec: 1, nsec: 0 },
      isPlaying: true,
      speed: 0.2,
      lastSeekTime: 0,
      topics: [{ name: "/input/foo", datatype: "foo" }],
      datatypes: { foo: [] },
    });

    await done;
    expect(messages).toHaveLength(4);
    expect(messages).toEqual([
      upstreamMessages[0],
      {
        topic: "/webviz/test",
        op: "message",
        receiveTime: { sec: 0, nsec: 1 },
        datatype: "test",
        message: {
          payload: "bar",
          callCount: 1,
        },
      },
      upstreamMessages[1],
      {
        topic: "/webviz/test",
        op: "message",
        receiveTime: { sec: 0, nsec: 100 },
        datatype: "test",
        message: {
          payload: "baz",
          callCount: 2,
        },
      },
    ]);
  });

  it("clears out states on seek", async () => {
    const fakePlayer = new FakePlayer();
    const nodePlayer = new NodePlayer(fakePlayer, [node]);
    const messages = [];
    const done = signal();
    nodePlayer.setListener(async (playerState) => {
      const incommingMessages = (playerState.activeData || {}).messages || [];
      if (incommingMessages.length) {
        messages.push(...incommingMessages);
        done.resolve();
      }
    });
    fakePlayer.emit({
      messages: [upstreamMessages[0]],
      currentTime: upstreamMessages[0].receiveTime,
      startTime: { sec: 0, nsec: 0 },
      endTime: { sec: 1, nsec: 0 },
      isPlaying: true,
      speed: 0.2,
      lastSeekTime: 0,
      topics: [{ name: "/input/foo", datatype: "foo" }],
      datatypes: { foo: [] },
    });

    fakePlayer.emit({
      messages: [upstreamMessages[1]],
      currentTime: upstreamMessages[1].receiveTime,
      startTime: { sec: 0, nsec: 0 },
      endTime: { sec: 1, nsec: 0 },
      isPlaying: true,
      speed: 0.2,
      // set the last seek time to a new value
      lastSeekTime: 1,
      topics: [{ name: "/input/foo", datatype: "foo" }],
      datatypes: { foo: [] },
    });
    await done;
    expect(messages).toHaveLength(4);
    expect(messages[0]).toEqual(upstreamMessages[0]);
    expect(messages[1]).toEqual({
      topic: "/webviz/test",
      op: "message",
      receiveTime: { sec: 0, nsec: 1 },
      datatype: "test",
      message: {
        payload: "bar",
        callCount: 1,
      },
    });
    expect(messages[2]).toEqual(upstreamMessages[1]);
    expect(messages[3]).toEqual({
      topic: "/webviz/test",
      op: "message",
      receiveTime: { sec: 0, nsec: 100 },
      datatype: "test",
      message: {
        payload: "baz",
        callCount: 1,
      },
    });
  });
});
