// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import NodePlayer from "./NodePlayer";
import signal from "webviz-core/shared/signal";
import FakePlayer from "webviz-core/src/components/MessagePipeline/FakePlayer";
import type { SubscribePayload, Message, BobjectMessage } from "webviz-core/src/players/types";
import { deepParse, wrapJsObject } from "webviz-core/src/util/binaryObjects";

const testMessageDefinition = { fields: [{ type: "string", name: "payload" }, { type: "int8", name: "callCount" }] };
const node = {
  inputs: ["/input/foo", "/input/bar"],
  output: { name: "/webviz/test", datatype: "test" },
  datatypes: {
    test: testMessageDefinition,
  },
  format: "parsedMessages",
  defaultState: { callCount: 0 },
  callback: ({ message, state }) => {
    const callCount = state.callCount + 1;
    return {
      messages: [
        {
          topic: "/webviz/test",
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

const bobjectNode = {
  inputs: ["/input/foo"],
  output: { name: "/webviz/bobject_test", datatype: "test" },
  datatypes: { test: testMessageDefinition },
  format: "bobjects",
  defaultState: { callCount: 0 },
  callback: ({ message, state }) => {
    const callCount = state.callCount + 1;
    return {
      messages: [
        {
          topic: "/webviz/bobject_test",
          receiveTime: message.receiveTime,
          message: { callCount, payload: message.message.payload() },
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
      bobjects: [],
      messageOrder: "receiveTime",
      currentTime: { sec: 0, nsec: 0 },
      startTime: { sec: 0, nsec: 0 },
      endTime: { sec: 1, nsec: 0 },
      isPlaying: true,
      speed: 0.2,
      lastSeekTime: 0,
      topics: [{ name: "/input/foo", datatype: "foo" }, { name: "/input/bar", datatype: "bar" }],
      datatypes: { foo: { fields: [] } },
      parsedMessageDefinitionsByTopic: {},
      playerWarnings: {},
      totalBytesReceived: 1234,
    });
    expect(messages).toHaveLength(1);
    const { activeData } = messages[0];
    expect(activeData).not.toBeUndefined();
    if (!activeData) {
      throw new Error("satisfy flow");
    }
    expect(activeData.datatypes).toEqual({
      test: testMessageDefinition,
      foo: { fields: [] },
    });
    expect(activeData.topics).toEqual([
      { name: "/input/foo", datatype: "foo" },
      { name: "/input/bar", datatype: "bar" },
      { name: "/webviz/test", datatype: "test" },
    ]);
  });

  it("will throw if the output datatype isn't present", () => {
    const fakePlayer = new FakePlayer();
    expect(
      () => new NodePlayer(fakePlayer, [{ ...node, output: { name: "/webviz/test", datatype: "unknown_msgs/T" } }])
    ).toThrow('The datatype "unknown_msgs/T" is not defined');
  });

  it("does not include a node if none of the input topics are available", () => {
    const fakePlayer = new FakePlayer();
    const nodePlayer = new NodePlayer(fakePlayer, [{ ...node, inputs: ["/unavailable_topic"] }]);
    const messages = [];
    nodePlayer.setListener(async (playerState) => {
      messages.push(playerState);
    });
    fakePlayer.emit({
      messages: [],
      bobjects: [],
      messageOrder: "receiveTime",
      currentTime: { sec: 0, nsec: 0 },
      startTime: { sec: 0, nsec: 0 },
      endTime: { sec: 1, nsec: 0 },
      isPlaying: true,
      speed: 0.2,
      lastSeekTime: 0,
      topics: [{ name: "/input/foo", datatype: "foo" }, { name: "/input/bar", datatype: "bar" }],
      datatypes: { foo: { fields: [] } },
      parsedMessageDefinitionsByTopic: {},
      playerWarnings: {},
      totalBytesReceived: 1234,
    });
    const { activeData } = messages[0];
    expect(activeData).not.toBeUndefined();
    if (!activeData) {
      throw new Error("satisfy flow");
    }
    expect(activeData.datatypes).toEqual({ foo: { fields: [] } });
    expect(activeData.topics).toEqual([
      { name: "/input/foo", datatype: "foo" },
      { name: "/input/bar", datatype: "bar" },
    ]);
  });

  it("includes a node if one of the input topics is available", () => {
    const fakePlayer = new FakePlayer();
    const nodePlayer = new NodePlayer(fakePlayer, [{ ...node, inputs: ["/input/foo", "/unavailable_topic"] }]);
    const messages = [];
    nodePlayer.setListener(async (playerState) => {
      messages.push(playerState);
    });
    fakePlayer.emit({
      messages: [],
      bobjects: [],
      messageOrder: "receiveTime",
      currentTime: { sec: 0, nsec: 0 },
      startTime: { sec: 0, nsec: 0 },
      endTime: { sec: 1, nsec: 0 },
      isPlaying: true,
      speed: 0.2,
      lastSeekTime: 0,
      topics: [{ name: "/input/foo", datatype: "foo" }, { name: "/input/bar", datatype: "bar" }],
      datatypes: { foo: { fields: [] } },
      parsedMessageDefinitionsByTopic: {},
      playerWarnings: {},
      totalBytesReceived: 1234,
    });
    const { activeData } = messages[0];
    expect(activeData).not.toBeUndefined();
    if (!activeData) {
      throw new Error("satisfy flow");
    }
    expect(activeData.datatypes).toEqual({
      test: testMessageDefinition,
      foo: { fields: [] },
    });
    expect(activeData.topics).toEqual([
      { name: "/input/foo", datatype: "foo" },
      { name: "/input/bar", datatype: "bar" },
      { name: "/webviz/test", datatype: "test" },
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
    nodePlayer.setSubscriptions([
      { topic: "/webviz/test", format: "parsedMessages" },
      { topic: "/input/baz", format: "parsedMessages" },
    ]);
    expect(fakePlayer.setSubscriptions.mock.calls).toEqual([
      [
        [
          { topic: "/input/baz", format: "parsedMessages" },
          { requester: { name: "/webviz/test", type: "node" }, topic: "/input/foo", format: "parsedMessages" },
          { requester: { name: "/webviz/test", type: "node" }, topic: "/input/bar", format: "parsedMessages" },
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
    expect(fakePlayer.seekPlayback).toHaveBeenCalledWith({ sec: 2, nsec: 2 }, undefined);
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
      receiveTime: { sec: 0, nsec: 1 },
      message: {
        payload: "bar",
      },
    },
    {
      topic: "/input/foo",
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
    nodePlayer.setSubscriptions([{ topic: "/webviz/test", format: "parsedMessages" }]);

    fakePlayer.emit({
      messages: upstreamMessages,
      bobjects: [],
      messageOrder: "receiveTime",
      currentTime: upstreamMessages[0].receiveTime,
      startTime: { sec: 0, nsec: 0 },
      endTime: { sec: 1, nsec: 0 },
      isPlaying: true,
      speed: 0.2,
      lastSeekTime: 0,
      topics: [{ name: "/input/foo", datatype: "foo" }],
      datatypes: { foo: { fields: [] } },
      parsedMessageDefinitionsByTopic: {},
      playerWarnings: {},
      totalBytesReceived: 1234,
    });

    await done;
    expect(messages).toHaveLength(4);
    expect(messages).toEqual([
      upstreamMessages[0],
      {
        topic: "/webviz/test",
        receiveTime: { sec: 0, nsec: 1 },
        message: {
          payload: "bar",
          callCount: 1,
        },
      },
      upstreamMessages[1],
      {
        topic: "/webviz/test",
        receiveTime: { sec: 0, nsec: 100 },
        message: {
          payload: "baz",
          callCount: 2,
        },
      },
    ]);
  });

  it("does not invoke nodes that have not been subscribed to", async () => {
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
      bobjects: [],
      messageOrder: "receiveTime",
      currentTime: upstreamMessages[0].receiveTime,
      startTime: { sec: 0, nsec: 0 },
      endTime: { sec: 1, nsec: 0 },
      isPlaying: true,
      speed: 0.2,
      lastSeekTime: 0,
      topics: [{ name: "/input/foo", datatype: "foo" }],
      datatypes: { foo: { fields: [] } },
      parsedMessageDefinitionsByTopic: {},
      playerWarnings: {},
      totalBytesReceived: 1234,
    });

    await done;
    expect(messages).toHaveLength(2);
    expect(messages).toEqual([upstreamMessages[0], upstreamMessages[1]]);
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
    nodePlayer.setSubscriptions([{ topic: "/webviz/test", format: "parsedMessages" }]);
    fakePlayer.emit({
      messages: [upstreamMessages[0]],
      bobjects: [],
      messageOrder: "receiveTime",
      currentTime: upstreamMessages[0].receiveTime,
      startTime: { sec: 0, nsec: 0 },
      endTime: { sec: 1, nsec: 0 },
      isPlaying: true,
      speed: 0.2,
      lastSeekTime: 0,
      topics: [{ name: "/input/foo", datatype: "foo" }],
      datatypes: { foo: { fields: [] } },
      parsedMessageDefinitionsByTopic: {},
      playerWarnings: {},
      totalBytesReceived: 1234,
    });

    fakePlayer.emit({
      messages: [upstreamMessages[1]],
      bobjects: [],
      messageOrder: "receiveTime",
      currentTime: upstreamMessages[1].receiveTime,
      startTime: { sec: 0, nsec: 0 },
      endTime: { sec: 1, nsec: 0 },
      isPlaying: true,
      speed: 0.2,
      // set the last seek time to a new value
      lastSeekTime: 1,
      topics: [{ name: "/input/foo", datatype: "foo" }],
      datatypes: { foo: { fields: [] } },
      parsedMessageDefinitionsByTopic: {},
      playerWarnings: {},
      totalBytesReceived: 1234,
    });
    await done;
    expect(messages).toHaveLength(4);
    expect(messages[0]).toEqual(upstreamMessages[0]);
    expect(messages[1]).toEqual({
      topic: "/webviz/test",
      receiveTime: { sec: 0, nsec: 1 },
      message: {
        payload: "bar",
        callCount: 1,
      },
    });
    expect(messages[2]).toEqual(upstreamMessages[1]);
    expect(messages[3]).toEqual({
      topic: "/webviz/test",
      receiveTime: { sec: 0, nsec: 100 },
      message: {
        payload: "baz",
        callCount: 1,
      },
    });
  });

  describe("bobjects", () => {
    const datatypes = { foo: { fields: [{ name: "payload", type: "string" }] } };
    const subscribeAndEmitFromPlayer = async (
      subscriptions: SubscribePayload[]
    ): Promise<{ parsedMessages: $ReadOnlyArray<Message>, bobjects: $ReadOnlyArray<BobjectMessage> }> => {
      const fakePlayer = new FakePlayer();
      const nodePlayer = new NodePlayer(fakePlayer, [node, bobjectNode]);
      const parsedMessages = [];
      const bobjects = [];
      const done = signal();
      nodePlayer.setListener(async (playerState) => {
        const incomingParsedMessages = playerState?.activeData?.messages;
        const incomingBobjects = playerState?.activeData?.bobjects;
        if (incomingParsedMessages?.length || incomingBobjects?.length) {
          parsedMessages.push(...(incomingParsedMessages || []));
          bobjects.push(...(incomingBobjects || []));
          done.resolve();
        }
      });
      nodePlayer.setSubscriptions(subscriptions);

      const emittedBobjects: $ReadOnlyArray<BobjectMessage> = upstreamMessages.map((msg) => ({
        topic: msg.topic,
        receiveTime: msg.receiveTime,
        message: wrapJsObject(datatypes, "foo", msg.message),
      }));

      fakePlayer.emit({
        messages: upstreamMessages,
        bobjects: emittedBobjects,
        messageOrder: "receiveTime",
        currentTime: upstreamMessages[0].receiveTime,
        startTime: { sec: 0, nsec: 0 },
        endTime: { sec: 1, nsec: 0 },
        isPlaying: true,
        speed: 0.2,
        lastSeekTime: 0,
        topics: [{ name: "/input/foo", datatype: "foo" }],
        datatypes,
        parsedMessageDefinitionsByTopic: {},
        playerWarnings: {},
        totalBytesReceived: 1234,
      });

      await done;

      return { parsedMessages, bobjects };
    };

    it("emits bobjects when subscribed to", async () => {
      const { parsedMessages, bobjects } = await subscribeAndEmitFromPlayer([
        { topic: "/webviz/test", format: "bobjects" },
      ]);
      expect(parsedMessages).toHaveLength(2);
      expect(bobjects).toHaveLength(4);
      expect(deepParse(bobjects[0].message)).toEqual({
        payload: "bar",
        callCount: 1,
      });

      expect(deepParse(bobjects[2].message)).toEqual({
        payload: "baz",
        callCount: 2,
      });
    });

    it("persists bobjects from underlying player", async () => {
      const { parsedMessages, bobjects } = await subscribeAndEmitFromPlayer([
        { topic: "/webviz/test", format: "bobjects" },
      ]);
      expect(parsedMessages).toHaveLength(2);
      expect(bobjects).toHaveLength(4);
      expect(bobjects.map((msg) => ({ ...msg, message: deepParse(msg.message) }))).toEqual([
        {
          topic: "/webviz/test",
          receiveTime: {
            sec: 0,
            nsec: 1,
          },
          message: {
            payload: "bar",
            callCount: 1,
          },
        },
        upstreamMessages[0],
        {
          topic: "/webviz/test",
          receiveTime: {
            sec: 0,
            nsec: 100,
          },
          message: {
            payload: "baz",
            callCount: 2,
          },
        },
        upstreamMessages[1],
      ]);
    });

    it("emits bobjects and parsedMessages when subscribed to", async () => {
      const { parsedMessages, bobjects } = await subscribeAndEmitFromPlayer([
        { topic: "/webviz/test", format: "bobjects" },
        { topic: "/webviz/test", format: "parsedMessages" },
      ]);

      expect(parsedMessages).toHaveLength(4);
      expect(bobjects).toHaveLength(4);

      [parsedMessages[1].message, deepParse(bobjects[0].message)].forEach((message) => {
        expect(message).toEqual({
          payload: "bar",
          callCount: 1,
        });
      });
      [parsedMessages[3].message, deepParse(bobjects[2].message)].forEach((message) => {
        expect(message).toEqual({
          payload: "baz",
          callCount: 2,
        });
      });
    });

    it("does not emit twice the number of messages if subscribed to twice", async () => {
      const { parsedMessages, bobjects } = await subscribeAndEmitFromPlayer([
        { topic: "/webviz/test", format: "parsedMessages" },
        { topic: "/webviz/test", format: "parsedMessages" },
        { topic: "/webviz/test", format: "bobjects" },
        { topic: "/webviz/test", format: "bobjects" },
        { topic: "/webviz/bobject_test", format: "parsedMessages" },
        { topic: "/webviz/bobject_test", format: "parsedMessages" },
        { topic: "/webviz/bobject_test", format: "bobjects" },
        { topic: "/webviz/bobject_test", format: "bobjects" },
      ]);

      // Two original messages in the right format, and two each from each node.
      expect(parsedMessages).toHaveLength(6);
      expect(bobjects).toHaveLength(6);
      expect(parsedMessages.filter(({ topic }) => topic === "/webviz/test").length).toEqual(2);
      expect(bobjects.filter(({ topic }) => topic === "/webviz/test").length).toEqual(2);
      expect(parsedMessages.filter(({ topic }) => topic === "/webviz/bobject_test").length).toEqual(2);
      expect(bobjects.filter(({ topic }) => topic === "/webviz/bobject_test").length).toEqual(2);
    });
  });
});
