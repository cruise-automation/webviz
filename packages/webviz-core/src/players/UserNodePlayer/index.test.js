// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { isPlainObject } from "lodash";

import signal from "webviz-core/shared/signal";
import FakePlayer from "webviz-core/src/components/MessagePipeline/FakePlayer";
import NodePlayer from "webviz-core/src/players/NodePlayer";
import type { SubscribePayload, Message, BobjectMessage } from "webviz-core/src/players/types";
import UserNodePlayer from "webviz-core/src/players/UserNodePlayer";
import { registerNode, processMessage } from "webviz-core/src/players/UserNodePlayer/nodeRuntimeWorker/registry";
import exampleDatatypes from "webviz-core/src/players/UserNodePlayer/nodeTransformerWorker/fixtures/example-datatypes.json";
import transform from "webviz-core/src/players/UserNodePlayer/nodeTransformerWorker/transformer";
import generateRosLib from "webviz-core/src/players/UserNodePlayer/nodeTransformerWorker/typegen";
import { Sources, DiagnosticSeverity, ErrorCodes } from "webviz-core/src/players/UserNodePlayer/types";
import { deepParse, wrapJsObject } from "webviz-core/src/util/binaryObjects";
import { basicDatatypes } from "webviz-core/src/util/datatypes";
import { DEFAULT_WEBVIZ_NODE_PREFIX } from "webviz-core/src/util/globalConstants";
import Rpc from "webviz-core/src/util/Rpc";

const nodeId = "nodeId";

const hardcodedNode = {
  inputs: ["/input/foo", "/input/bar"],
  output: { name: "/webviz/test", datatype: "test" },
  datatypes: { test: { fields: [{ type: "string", name: "foo" }] } },
  format: "parsedMessages",
  defaultState: {},
  callback: ({ message, state }) => ({
    messages: [
      {
        topic: "/webviz/test",
        receiveTime: message.receiveTime,
        message: message.message,
      },
    ],
    state,
  }),
};

const nodeUserCode = `
  export const inputs = ["/np_input"];
  export const output = "${DEFAULT_WEBVIZ_NODE_PREFIX}1";
  let lastStamp, lastReceiveTime;
  export default (message: { message: { payload: string } }): { custom_np_field: string, value: string } => {
    return { custom_np_field: "abc", value: message.message.payload };
  };
`;

const nodeUserCodeWithPointClouds = `
  import { convertToRangeView } from "./pointClouds";
  import { RGBA } from "./types";
  export const inputs = ["/np_input"];
  export const output = "${DEFAULT_WEBVIZ_NODE_PREFIX}1";
  export default (message: { message: { payload: string } }): RGBA => {
    const colors = convertToRangeView([{x:0.1, y:0.2, z:0.3}], 0.4, true);
    return colors[0];
  };
`;

jest.mock("webviz-core/src/util/Rpc", () =>
  jest.fn().mockImplementation(() => ({
    send: jest.fn(),
    receive: jest.fn(),
  }))
);

const validateWorkerArgs = (arg: any) => {
  expect(arg).not.toBeInstanceOf(Function);

  if (isPlainObject(arg)) {
    Object.values(arg).forEach((val) => {
      validateWorkerArgs(val);
    });
  } else if (Array.isArray(arg)) {
    arg.forEach(validateWorkerArgs);
  }
};

const defaultUserNodeActions = {
  setUserNodeDiagnostics: jest.fn(),
  addUserNodeLogs: jest.fn(),
  setUserNodeRosLib: jest.fn(),
};

const basicPlayerState = {
  startTime: { sec: 0, nsec: 0 },
  endTime: { sec: 1, nsec: 0 },
  isPlaying: true,
  speed: 0.2,
  lastSeekTime: 0,
  messageDefinitionsByTopic: {},
  playerWarnings: {},
  bobjects: [],
};
const upstreamMessages = [
  {
    topic: "/np_input",
    receiveTime: { sec: 0, nsec: 1 },
    message: {
      payload: "bar",
    },
  },
  {
    topic: "/np_input",
    receiveTime: { sec: 0, nsec: 100 },
    message: {
      payload: "baz",
    },
  },
];

const setListenerHelper = (player: UserNodePlayer, numPromises: number = 1) => {
  const signals = [...new Array(numPromises)].map(() => signal());
  let numEmits = 0;
  player.setListener(async (playerState) => {
    const topicNames = [];
    if (playerState.activeData) {
      topicNames.push(...playerState.activeData.topics.map((topic) => topic.name));
    }
    const messages = (playerState.activeData || {}).messages || [];
    const bobjects = (playerState.activeData || {}).bobjects || [];
    signals[numEmits].resolve({
      topicNames,
      messages,
      bobjects,
      topics: playerState.activeData?.topics,
      datatypes: playerState.activeData?.datatypes,
    });
    numEmits += 1;
  });

  return signals;
};

describe("UserNodePlayer", () => {
  beforeEach(() => {
    window.localStorage.clear();
    // Simply wires the RpcProvider interface into the user node registry.
    // $FlowFixMe - mocks are hard with flow
    Rpc.mockImplementation(() => ({
      send: (rpc, args) => {
        validateWorkerArgs(args);
        const rpcFuncMap = { registerNode, processMessage, transform, generateRosLib };
        const result = rpcFuncMap[rpc](args);
        validateWorkerArgs(result);
        return result;
      },
      receive: () => null,
    }));
  });

  afterAll(() => {
    window.localStorage.clear();
  });

  describe("default player behavior", () => {
    it("subscribes to underlying topics when node topics are subscribed", () => {
      const fakePlayer = new FakePlayer();
      const userNodePlayer = new UserNodePlayer(fakePlayer, defaultUserNodeActions);
      userNodePlayer.setListener(async () => {});
      userNodePlayer.setSubscriptions([
        { topic: "/webviz/test", format: "parsedMessages" },
        { topic: "/input/baz", format: "parsedMessages" },
      ]);
      expect(fakePlayer.subscriptions).toEqual([
        { topic: "/webviz/test", format: "parsedMessages" },
        { topic: "/input/baz", format: "parsedMessages" },
      ]);
    });

    it("delegates play and pause calls to underlying player", () => {
      const fakePlayer = new FakePlayer();
      jest.spyOn(fakePlayer, "startPlayback");
      jest.spyOn(fakePlayer, "pausePlayback");
      const userNodePlayer = new UserNodePlayer(fakePlayer, defaultUserNodeActions);
      const messages = [];
      userNodePlayer.setListener(async (playerState) => {
        messages.push(playerState);
      });
      expect(fakePlayer.startPlayback).not.toHaveBeenCalled();
      expect(fakePlayer.pausePlayback).not.toHaveBeenCalled();
      userNodePlayer.startPlayback();
      expect(fakePlayer.startPlayback).toHaveBeenCalled();
      expect(fakePlayer.pausePlayback).not.toHaveBeenCalled();
      userNodePlayer.pausePlayback();
      expect(fakePlayer.startPlayback).toHaveBeenCalled();
      expect(fakePlayer.pausePlayback).toHaveBeenCalled();
    });

    it("delegates setPlaybackSpeed to underlying player", () => {
      const fakePlayer = new FakePlayer();
      jest.spyOn(fakePlayer, "setPlaybackSpeed");
      const userNodePlayer = new UserNodePlayer(fakePlayer, defaultUserNodeActions);
      const messages = [];
      userNodePlayer.setListener(async (playerState) => {
        messages.push(playerState);
      });
      expect(fakePlayer.setPlaybackSpeed).not.toHaveBeenCalled();
      userNodePlayer.setPlaybackSpeed(0.4);
      expect(fakePlayer.setPlaybackSpeed).toHaveBeenCalledWith(0.4);
    });

    it("delegates seekPlayback to underlying player", () => {
      const fakePlayer = new FakePlayer();
      jest.spyOn(fakePlayer, "seekPlayback");
      const userNodePlayer = new UserNodePlayer(fakePlayer, defaultUserNodeActions);
      const messages = [];
      userNodePlayer.setListener(async (playerState) => {
        messages.push(playerState);
      });
      expect(fakePlayer.seekPlayback).not.toHaveBeenCalled();
      userNodePlayer.seekPlayback({ sec: 2, nsec: 2 });
      expect(fakePlayer.seekPlayback).toHaveBeenCalledWith({ sec: 2, nsec: 2 }, undefined);
    });

    it("delegates publishing to underlying player", () => {
      const fakePlayer = new FakePlayer();
      jest.spyOn(fakePlayer, "setPublishers");
      jest.spyOn(fakePlayer, "publish");
      const userNodePlayer = new UserNodePlayer(fakePlayer, defaultUserNodeActions);
      expect(fakePlayer.setPublishers).not.toHaveBeenCalled();
      expect(fakePlayer.publish).not.toHaveBeenCalled();
      const publishers = [{ topic: "/foo", datatype: "foo" }];
      userNodePlayer.setPublishers(publishers);
      expect(fakePlayer.setPublishers).toHaveBeenLastCalledWith(publishers);
      expect(fakePlayer.publish).not.toHaveBeenCalled();
      const publishPayload = { topic: "/foo", msg: {} };
      userNodePlayer.publish(publishPayload);
      expect(fakePlayer.publish).toHaveBeenCalledWith(publishPayload);
    });
  });

  describe("behavior with NodePlayer as player", () => {
    it("subscribes to general topics when subscribed to, without any Webviz nodes", () => {
      const fakePlayer = new FakePlayer();
      const nodePlayer = new NodePlayer(fakePlayer);
      const userNodePlayer = new UserNodePlayer(nodePlayer, defaultUserNodeActions);
      userNodePlayer.setListener(async () => {});
      userNodePlayer.setSubscriptions([
        { topic: "/input/foo", format: "parsedMessages" },
        { topic: "/input/baz", format: "parsedMessages" },
      ]);
      expect(fakePlayer.subscriptions).toEqual([
        { topic: "/input/foo", format: "parsedMessages" },
        { topic: "/input/baz", format: "parsedMessages" },
      ]);
    });

    it("subscribes to Webviz node topic when subscribed to, if it exists as an active Webviz node topic", () => {
      const fakePlayer = new FakePlayer();
      jest.spyOn(fakePlayer, "setSubscriptions");
      const nodePlayer = new NodePlayer(fakePlayer, [hardcodedNode]);
      const userNodePlayer = new UserNodePlayer(nodePlayer, defaultUserNodeActions);
      const messages = [];
      userNodePlayer.setListener(async (playerState) => {
        messages.push(playerState);
      });
      userNodePlayer.setSubscriptions([
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

    it("does not subscribe to Webviz node topic when subscribed to, if it doesn't exist as an active Webviz node", () => {
      const fakePlayer = new FakePlayer();
      const nodePlayer = new NodePlayer(fakePlayer);
      const userNodePlayer = new UserNodePlayer(nodePlayer, defaultUserNodeActions);
      userNodePlayer.setListener(async () => {});
      userNodePlayer.setSubscriptions([
        { topic: "/webviz/foo", format: "parsedMessages" },
        { topic: "/input/baz", format: "parsedMessages" },
      ]);
      expect(fakePlayer.subscriptions).toEqual([{ topic: "/input/baz", format: "parsedMessages" }]);
    });
  });

  describe("user node behavior", () => {
    it("exposes user node topics when available", async () => {
      const fakePlayer = new FakePlayer();
      const mockSetNodeDiagnostics = jest.fn();
      const userNodePlayer = new UserNodePlayer(fakePlayer, {
        ...defaultUserNodeActions,
        setUserNodeDiagnostics: mockSetNodeDiagnostics,
      });

      userNodePlayer.setUserNodes({ nodeId: { name: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, sourceCode: nodeUserCode } });

      const [done] = setListenerHelper(userNodePlayer);

      fakePlayer.emit({
        ...basicPlayerState,
        messages: [],
        messageOrder: "receiveTime",
        currentTime: { sec: 0, nsec: 0 },
        topics: [{ name: "/np_input", datatype: `${DEFAULT_WEBVIZ_NODE_PREFIX}1` }],
        datatypes: { foo: { fields: [] } },
      });

      const { topicNames, messages } = await done;

      expect(mockSetNodeDiagnostics).toHaveBeenCalledWith({ nodeId: { diagnostics: [] } });
      expect(messages.length).toEqual(0);
      expect(topicNames).toEqual(["/np_input", `${DEFAULT_WEBVIZ_NODE_PREFIX}1`]);
    });

    it("memoizes topics and datatypes (even after seeking / reinitializing nodes)", async () => {
      const fakePlayer = new FakePlayer();
      const mockSetNodeDiagnostics = jest.fn();
      const userNodePlayer = new UserNodePlayer(fakePlayer, {
        ...defaultUserNodeActions,
        setUserNodeDiagnostics: mockSetNodeDiagnostics,
      });

      userNodePlayer.setUserNodes({ nodeId: { name: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, sourceCode: nodeUserCode } });

      const [done1, done2, done3] = setListenerHelper(userNodePlayer, 3);

      const playerState = {
        ...basicPlayerState,
        messages: [],
        messageOrder: "receiveTime",
        currentTime: { sec: 0, nsec: 0 },
        topics: [{ name: "/np_input", datatype: "/np_input_datatype" }],
        datatypes: { foo: { fields: [] } },
      };

      fakePlayer.emit(playerState);
      const { topics: firstTopics, datatypes: firstDatatypes } = await done1;
      expect(firstTopics).toEqual([
        { name: "/np_input", datatype: "/np_input_datatype" },
        { name: "/webviz_node/1", datatype: `${DEFAULT_WEBVIZ_NODE_PREFIX}1` },
      ]);
      expect(firstDatatypes).toEqual({
        foo: { fields: [] },
        [`${DEFAULT_WEBVIZ_NODE_PREFIX}1`]: {
          fields: [
            { name: "custom_np_field", type: "string", isArray: false, isComplex: false },
            { name: "value", type: "string", isArray: false, isComplex: false },
          ],
        },
        ...basicDatatypes,
      });

      // Seek should keep topics memoized.
      fakePlayer.emit({ ...playerState, lastSeekTime: 123 });
      const { topics: secondTopics, datatypes: secondDatatypes } = await done2;
      expect(secondTopics).toBe(firstTopics);
      expect(secondDatatypes).toBe(firstDatatypes);

      // Changing topics/datatypes should not memoize.
      fakePlayer.emit({ ...playerState, topics: [], datatypes: {} });
      const { topics: thirdTopics, datatypes: thirdDatatypes } = await done3;
      expect(thirdTopics).not.toBe(firstTopics);
      expect(thirdDatatypes).not.toBe(firstDatatypes);
    });

    it("gets memoized version of messages if they have not changed", async () => {
      const fakePlayer = new FakePlayer();
      const mockAddUserNodeLogs = jest.fn();
      const userNodePlayer = new UserNodePlayer(fakePlayer, {
        ...defaultUserNodeActions,
        setUserNodeDiagnostics: jest.fn(),
        addUserNodeLogs: mockAddUserNodeLogs,
      });

      userNodePlayer.setSubscriptions([{ topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, format: "parsedMessages" }]);
      userNodePlayer.setUserNodes({
        nodeId: { name: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, sourceCode: `${nodeUserCode}\nlog("LOG VALUE HERE");` },
      });

      const messagesArray = [upstreamMessages[0]];

      const [done, nextDone] = setListenerHelper(userNodePlayer, 2);

      fakePlayer.emit({
        ...basicPlayerState,
        messages: messagesArray,
        messageOrder: "receiveTime",
        currentTime: { sec: 0, nsec: 0 },
        topics: [{ name: "/np_input", datatype: `${DEFAULT_WEBVIZ_NODE_PREFIX}1` }],
        datatypes: { foo: { fields: [] } },
      });

      const { messages } = await done;

      fakePlayer.emit({
        ...basicPlayerState,
        messages: messagesArray,
        messageOrder: "receiveTime",
        currentTime: { sec: 0, nsec: 0 },
        topics: [{ name: "/np_input", datatype: `${DEFAULT_WEBVIZ_NODE_PREFIX}1` }],
        datatypes: { foo: { fields: [] } },
      });

      const { messages: newMessages } = await nextDone;

      expect(mockAddUserNodeLogs).toHaveBeenCalledTimes(1);
      expect(messages).toBe(newMessages);
    });

    it("subscribes to underlying topics when nodeInfo is added", async () => {
      const fakePlayer = new FakePlayer();
      const userNodePlayer = new UserNodePlayer(fakePlayer, defaultUserNodeActions);

      const [done] = setListenerHelper(userNodePlayer);

      fakePlayer.emit({
        ...basicPlayerState,
        messages: [],
        messageOrder: "receiveTime",
        currentTime: { sec: 0, nsec: 0 },
        topics: [{ name: "/np_input", datatype: "std_msgs/Header" }],
        datatypes: { foo: { fields: [] } },
      });

      const { topicNames } = await done;
      userNodePlayer.setUserNodes({ nodeId: { name: "someNodeName", sourceCode: nodeUserCode } });
      userNodePlayer.setSubscriptions(topicNames.map((topic) => ({ topic, format: "parsedMessages" })));
      expect(fakePlayer.subscriptions).toEqual([{ topic: "/np_input", format: "parsedMessages" }]);
    });

    it("does not produce messages from UserNodes if not subscribed to", async () => {
      const fakePlayer = new FakePlayer();
      const userNodePlayer = new UserNodePlayer(fakePlayer, defaultUserNodeActions);

      const [done] = setListenerHelper(userNodePlayer);

      userNodePlayer.setUserNodes({
        [nodeId]: { name: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, sourceCode: nodeUserCode },
      });

      fakePlayer.emit({
        ...basicPlayerState,
        messages: [upstreamMessages[0]],
        messageOrder: "receiveTime",
        currentTime: upstreamMessages[0].receiveTime,
        topics: [{ name: "/np_input", datatype: "std_msgs/Header" }],
        datatypes: { foo: { fields: [] } },
      });

      const { messages, topicNames } = await done;
      expect(topicNames).toEqual(["/np_input", `${DEFAULT_WEBVIZ_NODE_PREFIX}1`]);
      expect(messages).toEqual([upstreamMessages[0]]);
    });

    it("produces messages from user input node code with messages produced from underlying player", async () => {
      const fakePlayer = new FakePlayer();
      const userNodePlayer = new UserNodePlayer(fakePlayer, defaultUserNodeActions);

      const [done] = setListenerHelper(userNodePlayer);

      // TODO: test here to make sure the user node does not produce messages if not subscribed to.
      userNodePlayer.setSubscriptions([{ topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, format: "parsedMessages" }]);
      await userNodePlayer.setUserNodes({
        [nodeId]: { name: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, sourceCode: nodeUserCode },
      });

      fakePlayer.emit({
        ...basicPlayerState,
        messages: [upstreamMessages[0]],
        messageOrder: "receiveTime",
        currentTime: upstreamMessages[0].receiveTime,
        topics: [{ name: "/np_input", datatype: "std_msgs/Header" }],
        datatypes: { foo: { fields: [] } },
      });

      const { messages } = await done;

      expect(messages).toEqual([
        upstreamMessages[0],
        {
          topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`,
          receiveTime: upstreamMessages[0].receiveTime,
          message: { custom_np_field: "abc", value: "bar" },
        },
      ]);
    });

    it("does not add to logs when there is no 'log' invocation in the user code", async () => {
      const fakePlayer = new FakePlayer();
      const mockAddUserNodeLogs = jest.fn();
      const userNodePlayer = new UserNodePlayer(fakePlayer, {
        ...defaultUserNodeActions,
        setUserNodeDiagnostics: jest.fn(),
        addUserNodeLogs: mockAddUserNodeLogs,
      });

      const [done] = setListenerHelper(userNodePlayer);

      userNodePlayer.setSubscriptions([{ topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, format: "parsedMessages" }]);
      await userNodePlayer.setUserNodes({
        [nodeId]: { name: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, sourceCode: nodeUserCode },
      });

      fakePlayer.emit({
        ...basicPlayerState,
        messages: [upstreamMessages[0]],
        messageOrder: "receiveTime",
        currentTime: upstreamMessages[0].receiveTime,
        topics: [{ name: "/np_input", datatype: "std_msgs/Header" }],
        datatypes: { foo: { fields: [] } },
      });

      await done;
      expect(mockAddUserNodeLogs).not.toHaveBeenCalled();
    });

    it("provides access to './pointClouds' library for user input node code", async () => {
      const fakePlayer = new FakePlayer();
      const userNodePlayer = new UserNodePlayer(fakePlayer, defaultUserNodeActions);

      const [done] = setListenerHelper(userNodePlayer);

      userNodePlayer.setSubscriptions([{ topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, format: "parsedMessages" }]);
      await userNodePlayer.setUserNodes({
        [nodeId]: { name: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, sourceCode: nodeUserCodeWithPointClouds },
      });

      fakePlayer.emit({
        ...basicPlayerState,
        messages: [upstreamMessages[0]],
        messageOrder: "receiveTime",
        currentTime: upstreamMessages[0].receiveTime,
        topics: [{ name: "/np_input", datatype: "std_msgs/Header" }],
        datatypes: { foo: { fields: [] } },
      });

      const { messages } = await done;

      expect(messages).toEqual([
        upstreamMessages[0],
        {
          topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`,
          receiveTime: upstreamMessages[0].receiveTime,
          message: { a: 1, b: 0.7483314773547883, g: 0.7483314773547883, r: 1 },
        },
      ]);
    });

    it("skips publishing messages if a node does not produce a message", async () => {
      const fakePlayer = new FakePlayer();
      const userNodePlayer = new UserNodePlayer(fakePlayer, defaultUserNodeActions);

      const [done, nextDone] = setListenerHelper(userNodePlayer, 2);

      const unionTypeReturn = `
        export const inputs = ["/np_input"];
        export const output = "${DEFAULT_WEBVIZ_NODE_PREFIX}1";
        let lastStamp, lastReceiveTime;
        export default (message: { message: { payload: string } }): { custom_np_field: string, value: string } | undefined => {
          if (message.message.payload === "bar") {
            return;
          }
          return { custom_np_field: "abc", value: message.message.payload };
        };
      `;

      // TODO: test here to make sure the user node does not produce messages if not subscribed to.
      userNodePlayer.setSubscriptions([{ topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, format: "parsedMessages" }]);
      await userNodePlayer.setUserNodes({
        [nodeId]: { name: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, sourceCode: unionTypeReturn },
      });

      fakePlayer.emit({
        ...basicPlayerState,
        messages: [upstreamMessages[0]],
        messageOrder: "receiveTime",
        currentTime: upstreamMessages[0].receiveTime,
        topics: [{ name: "/np_input", datatype: "std_msgs/Header" }],
        datatypes: { foo: { fields: [] } },
      });

      const result = await done;
      expect(result.messages).toEqual([upstreamMessages[0]]);

      fakePlayer.emit({
        ...basicPlayerState,
        messages: [upstreamMessages[1]],
        messageOrder: "receiveTime",
        currentTime: upstreamMessages[1].receiveTime,
        topics: [{ name: "/np_input", datatype: "std_msgs/Header" }],
        datatypes: { foo: { fields: [] } },
      });

      const nextResult = await nextDone;
      expect(nextResult.messages).toEqual([
        upstreamMessages[1],
        {
          topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`,
          receiveTime: upstreamMessages[1].receiveTime,
          message: { custom_np_field: "abc", value: "baz" },
        },
      ]);
    });

    it("should handle multiple user nodes", async () => {
      const fakePlayer = new FakePlayer();
      const userNodePlayer = new UserNodePlayer(fakePlayer, defaultUserNodeActions);

      const [done] = setListenerHelper(userNodePlayer);

      userNodePlayer.setUserNodes({
        [`${DEFAULT_WEBVIZ_NODE_PREFIX}1`]: { name: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, sourceCode: nodeUserCode },
      });

      const nodeUserCode2 = nodeUserCode.replace(`${DEFAULT_WEBVIZ_NODE_PREFIX}1`, `${DEFAULT_WEBVIZ_NODE_PREFIX}2`);
      userNodePlayer.setUserNodes({
        [nodeId]: { name: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, sourceCode: nodeUserCode },
        [`${nodeId}2`]: {
          name: `${DEFAULT_WEBVIZ_NODE_PREFIX}2`,
          sourceCode: nodeUserCode2,
        },
      });

      userNodePlayer.setSubscriptions([
        { topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, format: "parsedMessages" },
        { topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}2`, format: "parsedMessages" },
      ]);

      fakePlayer.emit({
        ...basicPlayerState,
        messages: [upstreamMessages[0]],
        messageOrder: "receiveTime",
        currentTime: upstreamMessages[0].receiveTime,
        topics: [{ name: "/np_input", datatype: "std_msgs/Header" }],
        datatypes: { foo: { fields: [] }, "std_msgs/Header": { fields: [] } },
      });

      const { messages } = await done;

      expect(messages.length).toEqual(3);
      expect(messages).toEqual([
        upstreamMessages[0],
        {
          topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`,
          receiveTime: upstreamMessages[0].receiveTime,
          message: { custom_np_field: "abc", value: "bar" },
        },
        {
          topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}2`,
          receiveTime: upstreamMessages[0].receiveTime,
          message: { custom_np_field: "abc", value: "bar" },
        },
      ]);
    });
    it("resets user node state on seek", async () => {
      const sourceCode = `
        let innerState = 0;
        export const inputs = ["/np_input"];
        export const output = "${DEFAULT_WEBVIZ_NODE_PREFIX}1";
        export default (): { innerState: number } => {
          innerState += 1;
          return { innerState };
        };
      `;

      const fakePlayer = new FakePlayer();
      const userNodePlayer = new UserNodePlayer(fakePlayer, defaultUserNodeActions);

      userNodePlayer.setUserNodes({
        [nodeId]: { name: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, sourceCode },
      });

      userNodePlayer.setSubscriptions([{ topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, format: "parsedMessages" }]);

      const [firstDone, secondDone] = setListenerHelper(userNodePlayer, 2);

      fakePlayer.emit({
        ...basicPlayerState,
        messages: [upstreamMessages[0]],
        messageOrder: "receiveTime",
        currentTime: upstreamMessages[0].receiveTime,
        topics: [{ name: "/np_input", datatype: "std_msgs/Header" }],
        datatypes: { foo: { fields: [] }, "std_msgs/Header": { fields: [] } },
      });

      await firstDone;

      fakePlayer.emit({
        ...basicPlayerState,
        messages: [upstreamMessages[1]],
        messageOrder: "receiveTime",
        currentTime: upstreamMessages[1].receiveTime,
        lastSeekTime: 1,
        topics: [{ name: "/np_input", datatype: "std_msgs/Header" }],
        datatypes: { foo: { fields: [] }, "std_msgs/Header": { fields: [] } },
      });

      const { messages } = await secondDone;

      expect(messages[messages.length - 1].message).toEqual({
        innerState: 1,
      });
    });
    it.each([
      {
        code: `
          export const inputs = ["/np_input"];
          export const output = "${DEFAULT_WEBVIZ_NODE_PREFIX}1";
          export default (messages: any): { num: number } => {
            if (messages.message) {
              throw new Error("error path");
            }
            return { num: 42 };
          };`,
        error: "Error: error path",
      },
      {
        code: `
          export const inputs = ["/np_input"];
          export const output = "${DEFAULT_WEBVIZ_NODE_PREFIX}1";
          export default (messages: any): { num: number } => {
            if (messages.message) {
             const badPropertyAcess = messages.message.message.message;
            }
            return { num: 42 };
          };`,
        error: "TypeError: Cannot read property 'message' of undefined",
      },
      {
        code: `
          export const inputs = ["/np_input"];
          export const output = "${DEFAULT_WEBVIZ_NODE_PREFIX}1";
          const x: any = {};
          const y = x.bad.bad;
          export default (messages: any): { num: number } => {
            return { num: 42 };
          };`,
        error: "TypeError: Cannot read property 'bad' of undefined",
      },
      {
        code: `
          export const inputs = ["/np_input"];
          export const output = "${DEFAULT_WEBVIZ_NODE_PREFIX}1";
          throw "";
          export default (messages: any): { num: number } => {
            return { num: 42 };
          };`,
        error: "Unknown error encountered registering this node.",
      },
      {
        code: `
        export const inputs = ["/np_input"];
        export const output = "${DEFAULT_WEBVIZ_NODE_PREFIX}1";
        export default (messages: any): { num: number } => {
          throw ""
          return { num: 42 };
        };`,
        error: "Unknown error encountered running this node.",
      },

      {
        code: `
          export const inputs = ["/np_input"];
          export const output = "${DEFAULT_WEBVIZ_NODE_PREFIX}1";
          export default (messages: any): { num: number } => {
          if (messages.message) {
            throw new Error("");
          }
            return { num: 42 };
          };`,
        error: "Error",
      },
      {
        code: `
        export const inputs = ["/np_input"];
        export const output = "${DEFAULT_WEBVIZ_NODE_PREFIX}1";
        if (inputs.length) {
          throw new Error("");
        }
        export default (messages: any): { num: number } => {
          return { num: 42 };
        };`,
        error: "Error",
      },
    ])("records runtime errors in the diagnostics handler", async ({ code, error }) => {
      const fakePlayer = new FakePlayer();
      const mockSetNodeDiagnostics = jest.fn();
      const userNodePlayer = new UserNodePlayer(fakePlayer, {
        ...defaultUserNodeActions,
        setUserNodeDiagnostics: mockSetNodeDiagnostics,
      });

      userNodePlayer.setSubscriptions([{ topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, format: "parsedMessages" }]);
      userNodePlayer.setUserNodes({ nodeId: { name: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, sourceCode: code } });

      const [done] = setListenerHelper(userNodePlayer);

      fakePlayer.emit({
        ...basicPlayerState,
        messages: [upstreamMessages[0]],
        messageOrder: "receiveTime",
        currentTime: upstreamMessages[0].receiveTime,
        topics: [{ name: "/np_input", datatype: "std_msgs/Header" }],
        datatypes: { foo: { fields: [] }, "std_msgs/Header": { fields: [] } },
      });

      const { topicNames, messages } = await done;
      expect(mockSetNodeDiagnostics).toHaveBeenLastCalledWith({
        nodeId: {
          diagnostics: [
            {
              source: Sources.Runtime,
              severity: DiagnosticSeverity.Error,
              message: error,
              code: ErrorCodes.RUNTIME,
            },
          ],
        },
      });
      // Sanity check to ensure none of the user node messages made it through if there was an error.
      expect(messages.map(({ topic }) => topic)).not.toContain(`${DEFAULT_WEBVIZ_NODE_PREFIX}1`);
      expect(topicNames).toEqual(["/np_input", `${DEFAULT_WEBVIZ_NODE_PREFIX}1`]);
    });

    it("properly clears user node registrations", async () => {
      const fakePlayer = new FakePlayer();
      const userNodePlayer = new UserNodePlayer(fakePlayer, defaultUserNodeActions);

      userNodePlayer.setUserNodes({
        [nodeId]: { name: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, sourceCode: nodeUserCode },
      });

      const [firstDone, secondDone] = setListenerHelper(userNodePlayer, 2);

      fakePlayer.emit({
        ...basicPlayerState,
        messages: [upstreamMessages[0]],
        messageOrder: "receiveTime",
        currentTime: upstreamMessages[0].receiveTime,
        topics: [{ name: "/np_input", datatype: "std_msgs/Header" }],
        datatypes: { foo: { fields: [] }, "std_msgs/Header": { fields: [] } },
      });

      const { topicNames: firstTopicNames } = await firstDone;
      expect(firstTopicNames).toEqual(["/np_input", `${DEFAULT_WEBVIZ_NODE_PREFIX}1`]);

      userNodePlayer.setUserNodes({});
      fakePlayer.emit({
        ...basicPlayerState,
        messages: [upstreamMessages[0]],
        messageOrder: "receiveTime",
        currentTime: upstreamMessages[0].receiveTime,
        topics: [{ name: "/np_input", datatype: "std_msgs/Header" }],
        datatypes: { foo: { fields: [] }, "std_msgs/Header": { fields: [] } },
      });
      const { topicNames: secondTopicNames } = await secondDone;
      expect(secondTopicNames).toEqual(["/np_input"]);
    });

    describe("user logging", () => {
      it("records logs in the logs handler", async () => {
        const code = `
        import { Time } from "ros";
        type InputTopicMsg = {header: {stamp: Time}};
        type Marker = {};
        type MarkerArray = { markers: Marker[] }

        export const inputs = ["/np_input"];
        export const output = "${DEFAULT_WEBVIZ_NODE_PREFIX}1";
        const publisher = (message: { message: any }): MarkerArray => {
          log("inside publisher", message.message);
          return { markers: [] };
        };

        log(50, "ABC", null, undefined, 5 + 5);
        log({ "abc": 2, "def": false, });
        const add = (a: number, b: number): number => a + b;
        log("SUM: " + add(1, 2));

        export default publisher;
      `;

        const logs = [
          [
            { source: "registerNode", value: 50 },
            { source: "registerNode", value: "ABC" },
            { source: "registerNode", value: null },
            { source: "registerNode", value: undefined },
            { source: "registerNode", value: 10 },
            { source: "registerNode", value: { abc: 2, def: false } },
            { source: "registerNode", value: "SUM: 3" },
          ],
          [
            { source: "processMessage", value: "inside publisher" },
            { source: "processMessage", value: { payload: "bar" } },
          ],
        ];

        const fakePlayer = new FakePlayer();
        const mockAddNodeLogs = jest.fn();
        const userNodePlayer = new UserNodePlayer(fakePlayer, {
          ...defaultUserNodeActions,
          addUserNodeLogs: mockAddNodeLogs,
        });
        const [done] = setListenerHelper(userNodePlayer);

        userNodePlayer.setSubscriptions([{ topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, format: "parsedMessages" }]);
        userNodePlayer.setUserNodes({ [nodeId]: { name: `${DEFAULT_WEBVIZ_NODE_PREFIX}nodeName`, sourceCode: code } });

        fakePlayer.emit({
          ...basicPlayerState,
          messages: [upstreamMessages[0]],
          messageOrder: "receiveTime",
          currentTime: upstreamMessages[0].receiveTime,
          topics: [{ name: "/np_input", datatype: "std_msgs/Header" }],
          datatypes: { foo: { fields: [] }, "std_msgs/Header": { fields: [] } },
        });

        const { topicNames } = await done;
        expect(mockAddNodeLogs).toHaveBeenCalled();
        expect(mockAddNodeLogs.mock.calls).toEqual(logs.map((log) => [{ nodeId: { logs: log } }]));
        expect(topicNames).toEqual(["/np_input", `${DEFAULT_WEBVIZ_NODE_PREFIX}1`]);
      });

      it("does not record logs if there is an error", async () => {
        const code = `
        import { Time, Message } from "ros";
        type InputTopicMsg = {header: {stamp: Time}};
        type Marker = {};
        type MarkerArray = { markers: Marker[] }

        export const inputs = ["/np_input"];
        export const output = "${DEFAULT_WEBVIZ_NODE_PREFIX}1";
        const publisher = (message: Message<InputTopicMsg>): MarkerArray => {
          log("inside publisher", message.message);
          return { markers: [] };
        };

        print("HELLO");

        export default publisher;
      `;

        const fakePlayer = new FakePlayer();
        const mockAddNodeLogs = jest.fn();
        const userNodePlayer = new UserNodePlayer(fakePlayer, {
          ...defaultUserNodeActions,
          addUserNodeLogs: mockAddNodeLogs,
        });
        const [done] = setListenerHelper(userNodePlayer);

        fakePlayer.emit({
          ...basicPlayerState,
          messages: [upstreamMessages[0]],
          messageOrder: "receiveTime",
          currentTime: upstreamMessages[0].receiveTime,
          topics: [{ name: "/np_input", datatype: "std_msgs/Header" }],
          datatypes: { foo: { fields: [] }, "std_msgs/Header": { fields: [] } },
        });

        userNodePlayer.setSubscriptions([{ topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, format: "parsedMessages" }]);
        userNodePlayer.setUserNodes({ nodeId: { name: "nodeName", sourceCode: code } });

        const { topicNames } = await done;
        expect(mockAddNodeLogs.mock.calls).toEqual([]);
        expect(topicNames).toEqual(["/np_input"]);
      });
    });

    describe("datatypes", () => {
      it("updates the extracted datatype on a user code change", async () => {
        const sourceCode = `
        let innerState = 0;
        export const inputs = ["/np_input"];
        export const output = "${DEFAULT_WEBVIZ_NODE_PREFIX}innerState";
        export default (): { innerState: number } => {
          innerState += 1;
          return { innerState };
        };
      `;

        const fakePlayer = new FakePlayer();
        const userNodePlayer = new UserNodePlayer(fakePlayer, defaultUserNodeActions);
        const firstName = `${DEFAULT_WEBVIZ_NODE_PREFIX}innerState`;

        userNodePlayer.setUserNodes({
          [nodeId]: { name: firstName, sourceCode },
        });
        userNodePlayer.setSubscriptions([{ topic: firstName, format: "parsedMessages" }]);

        // Update the name of the node.
        const secondName = `${DEFAULT_WEBVIZ_NODE_PREFIX}state`;
        const secondSourceCode = sourceCode.replace(/innerState/g, "state");

        userNodePlayer.setUserNodes({
          [nodeId]: {
            name: secondName,
            sourceCode: secondSourceCode,
          },
        });
        userNodePlayer.setSubscriptions([{ topic: secondName, format: "parsedMessages" }]);

        const [done] = setListenerHelper(userNodePlayer);

        fakePlayer.emit({
          ...basicPlayerState,
          messages: [upstreamMessages[0]],
          messageOrder: "receiveTime",
          currentTime: upstreamMessages[0].receiveTime,
          topics: [{ name: "/np_input", datatype: "std_msgs/Header" }],
          datatypes: { foo: { fields: [] }, "std_msgs/Header": { fields: [] } },
        });

        const { topics } = await done;
        expect(topics).toEqual([
          { name: "/np_input", datatype: "std_msgs/Header" },
          { name: `${DEFAULT_WEBVIZ_NODE_PREFIX}state`, datatype: `${DEFAULT_WEBVIZ_NODE_PREFIX}state` },
        ]);
      });
      it("uses dynamically generated type definitions", async () => {
        const sourceCode = `
          import { Input, Messages } from 'ros';
          let innerState = 0;
          export const inputs = ["/np_input"];
          export const output = "${DEFAULT_WEBVIZ_NODE_PREFIX}state";
          export default (message: Input<"/np_input">): Messages.std_msgs__Header => {
            return message.message;
          };
        `;

        const fakePlayer = new FakePlayer();
        const userNodePlayer = new UserNodePlayer(fakePlayer, defaultUserNodeActions);
        const firstName = `${DEFAULT_WEBVIZ_NODE_PREFIX}state`;

        userNodePlayer.setUserNodes({
          [nodeId]: { name: firstName, sourceCode },
        });
        userNodePlayer.setSubscriptions([{ topic: firstName, format: "parsedMessages" }]);

        const [done] = setListenerHelper(userNodePlayer);

        fakePlayer.emit({
          ...basicPlayerState,
          messages: [upstreamMessages[0]],
          messageOrder: "receiveTime",
          currentTime: upstreamMessages[0].receiveTime,
          topics: [{ name: "/np_input", datatype: "std_msgs/Header" }],
          datatypes: exampleDatatypes,
        });

        const { topics } = await done;
        expect(topics).toEqual([
          { name: "/np_input", datatype: "std_msgs/Header" },
          { name: `${DEFAULT_WEBVIZ_NODE_PREFIX}state`, datatype: "std_msgs/Header" },
        ]);
      });
    });
  });
  describe("bobjects", () => {
    const subscribeAndEmitFromPlayer = async (
      subscriptions: SubscribePayload[]
    ): Promise<{ messages: $ReadOnlyArray<Message>, bobjects: $ReadOnlyArray<BobjectMessage> }> => {
      const fakePlayer = new FakePlayer();
      const userNodePlayer = new UserNodePlayer(fakePlayer, defaultUserNodeActions);

      const [done] = setListenerHelper(userNodePlayer);

      userNodePlayer.setSubscriptions(subscriptions);
      await userNodePlayer.setUserNodes({
        [nodeId]: { name: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, sourceCode: nodeUserCode },
      });

      const datatypes = { foo: { fields: [{ name: "payload", type: "string" }] } };

      const upstreamMessage: Message = upstreamMessages[0];
      fakePlayer.emit({
        ...basicPlayerState,
        messages: [upstreamMessage],
        bobjects: [{ ...upstreamMessage, message: wrapJsObject(datatypes, "foo", upstreamMessage.message) }],
        messageOrder: "receiveTime",
        currentTime: upstreamMessages[0].receiveTime,
        topics: [{ name: "/np_input", datatype: "foo" }],
        datatypes,
      });

      const { messages, bobjects } = await done;

      return { messages, bobjects };
    };

    it("emits sorted bobjects when subscribed to", async () => {
      const { messages, bobjects } = await subscribeAndEmitFromPlayer([
        { topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, format: "bobjects" },
      ]);
      expect(messages.length).toEqual(1);
      expect(messages).toEqual([upstreamMessages[0]]);

      expect(bobjects.length).toEqual(2);
      expect(bobjects.map((msg) => ({ ...msg, message: deepParse(msg.message) }))).toEqual([
        upstreamMessages[0],
        {
          topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`,
          receiveTime: upstreamMessages[0].receiveTime,
          message: { custom_np_field: "abc", value: "bar" },
        },
      ]);
    });

    it("persists bobjects from underlying player", async () => {
      const { messages, bobjects } = await subscribeAndEmitFromPlayer([
        { topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, format: "bobjects" },
      ]);
      expect(messages.length).toEqual(1);
      expect(messages).toEqual([upstreamMessages[0]]);

      expect(bobjects.length).toEqual(2);
      expect(
        bobjects
          .map((msg) => ({ ...msg, message: deepParse(msg.message) }))
          .filter(({ topic }) => topic !== "/webviz_node/1")
      ).toEqual([upstreamMessages[0]]);
    });

    it("emits bobjects and parsedMessages when subscribed to", async () => {
      const { messages, bobjects } = await subscribeAndEmitFromPlayer([
        { topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, format: "parsedMessages" },
        { topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, format: "bobjects" },
      ]);

      expect(messages.length).toEqual(2);
      expect(messages).toEqual([
        upstreamMessages[0],
        {
          topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`,
          receiveTime: upstreamMessages[0].receiveTime,
          message: { custom_np_field: "abc", value: "bar" },
        },
      ]);

      expect(bobjects.length).toEqual(2);
      expect(
        bobjects
          .map((msg) => ({ ...msg, message: deepParse(msg.message) }))
          .filter(({ topic }) => topic === "/webviz_node/1")
      ).toEqual([
        {
          topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`,
          receiveTime: upstreamMessages[0].receiveTime,
          message: { custom_np_field: "abc", value: "bar" },
        },
      ]);
    });
    it("does not emit twice the number of messages if subscribed to twice", async () => {
      const { messages, bobjects } = await subscribeAndEmitFromPlayer([
        { topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, format: "bobjects" },
        { topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, format: "bobjects" },
      ]);
      expect(messages).toEqual([upstreamMessages[0]]);

      expect(
        bobjects
          .map((msg) => ({ ...msg, message: deepParse(msg.message) }))
          .filter(({ topic }) => topic === "/webviz_node/1")
      ).toEqual([
        {
          topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`,
          receiveTime: upstreamMessages[0].receiveTime,
          message: { custom_np_field: "abc", value: "bar" },
        },
      ]);
    });
  });
});
