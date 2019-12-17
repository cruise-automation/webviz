// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { isPlainObject } from "lodash";

import signal from "webviz-core/shared/signal";
import { type SetUserNodeTrust } from "webviz-core/src/actions/userNodes";
import FakePlayer from "webviz-core/src/components/MessagePipeline/FakePlayer";
import NodePlayer from "webviz-core/src/players/NodePlayer";
import UserNodePlayer from "webviz-core/src/players/UserNodePlayer";
import { registerNode, processMessage } from "webviz-core/src/players/UserNodePlayer/nodeRuntimeWorker/registry";
import { trustUserNode } from "webviz-core/src/players/UserNodePlayer/nodeSecurity";
import transform from "webviz-core/src/players/UserNodePlayer/nodeTransformerWorker/transformer";
import { Sources, DiagnosticSeverity, ErrorCodes } from "webviz-core/src/players/UserNodePlayer/types";
import { DEFAULT_WEBVIZ_NODE_PREFIX } from "webviz-core/src/util/globalConstants";
import Rpc from "webviz-core/src/util/Rpc";

const nodeId = "nodeId";

const hardcodedNode = {
  inputs: ["/input/foo", "/input/bar"],
  output: { name: "/webviz/test", datatype: "test" },
  datatypes: { test: { fields: [{ type: "string", name: "foo" }] } },
  defaultState: {},
  callback: ({ message, state }) => ({
    messages: [
      {
        op: "message",
        topic: "/webviz/test",
        datatype: "test",
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
  setUserNodeTrust: jest.fn(),
};

describe("UserNodePlayer", () => {
  beforeEach(() => {
    window.localStorage.clear();
    // Simply wires the RpcProvider interface into the user node registry.
    // $FlowFixMe - mocks are hard with flow
    Rpc.mockImplementation(() => ({
      send: (rpc, args) => {
        validateWorkerArgs(args);
        const rpcFuncMap = { registerNode, processMessage, transform };
        const result = rpcFuncMap[rpc](args);
        validateWorkerArgs(result);
        return result;
      },
    }));
  });

  afterAll(() => {
    window.localStorage.clear();
  });

  describe("default player behavior", () => {
    it("subscribes to underlying topics when node topics are subscribed", () => {
      const fakePlayer = new FakePlayer();
      const userNodePlayer = new UserNodePlayer(fakePlayer, defaultUserNodeActions);
      userNodePlayer.setListener(async (playerState) => {});
      userNodePlayer.setSubscriptions([{ topic: "/webviz/test" }, { topic: "/input/baz" }]);
      expect(fakePlayer.subscriptions).toEqual([{ topic: "/webviz/test" }, { topic: "/input/baz" }]);
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
      expect(fakePlayer.seekPlayback).toHaveBeenCalledWith({ sec: 2, nsec: 2 });
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
      userNodePlayer.setListener(async (playerState) => {});
      userNodePlayer.setSubscriptions([{ topic: "/input/foo" }, { topic: "/input/baz" }]);
      expect(fakePlayer.subscriptions).toEqual([{ topic: "/input/foo" }, { topic: "/input/baz" }]);
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
      userNodePlayer.setSubscriptions([{ topic: "/webviz/test" }, { topic: "/input/baz" }]);
      expect(fakePlayer.setSubscriptions.mock.calls).toEqual([
        [
          [
            { topic: "/input/baz" },
            { requester: { name: "/webviz/test", type: "node" }, topic: "/input/foo" },
            { requester: { name: "/webviz/test", type: "node" }, topic: "/input/bar" },
          ],
        ],
      ]);
    });

    it("does not subscribe to Webviz node topic when subscribed to, if it doesn't exist as an active Webviz node", () => {
      const fakePlayer = new FakePlayer();
      const nodePlayer = new NodePlayer(fakePlayer);
      const userNodePlayer = new UserNodePlayer(nodePlayer, defaultUserNodeActions);
      userNodePlayer.setListener(async (playerState) => {});
      userNodePlayer.setSubscriptions([{ topic: "/webviz/foo" }, { topic: "/input/baz" }]);
      expect(fakePlayer.subscriptions).toEqual([{ topic: "/input/baz" }]);
    });
  });

  describe("user node behavior", () => {
    const basicPlayerState = {
      startTime: { sec: 0, nsec: 0 },
      endTime: { sec: 1, nsec: 0 },
      isPlaying: true,
      speed: 0.2,
      lastSeekTime: 0,
    };
    const upstreamMessages = [
      {
        topic: "/np_input",
        datatype: "std_msgs/Header",
        op: "message",
        receiveTime: { sec: 0, nsec: 1 },
        message: {
          payload: "bar",
        },
      },
      {
        topic: "/np_input",
        datatype: "std_msgs/Header",
        op: "message",
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
        const topics = [];
        if (playerState.activeData) {
          topics.push(...playerState.activeData.topics.map((topic) => topic.name));
        }
        const messages = (playerState.activeData || {}).messages || [];
        signals[numEmits].resolve({ topics, messages });
        numEmits += 1;
      });

      return signals;
    };

    it("exposes user node topics when available", async () => {
      const fakePlayer = new FakePlayer();
      const mockSetNodeDiagnostics = jest.fn();
      const userNodePlayer = new UserNodePlayer(fakePlayer, {
        ...defaultUserNodeActions,
        setUserNodeDiagnostics: mockSetNodeDiagnostics,
      });

      await trustUserNode({ id: nodeId, sourceCode: nodeUserCode });
      userNodePlayer.setUserNodes({ nodeId: { name: "someNodeName", sourceCode: nodeUserCode } });

      const [done] = setListenerHelper(userNodePlayer);

      fakePlayer.emit({
        ...basicPlayerState,
        messages: [],
        currentTime: { sec: 0, nsec: 0 },
        topics: [{ name: "/np_input", datatype: `${DEFAULT_WEBVIZ_NODE_PREFIX}1` }],
        datatypes: { foo: { fields: [] } },
      });

      const { topics, messages } = await done;

      expect(mockSetNodeDiagnostics).toHaveBeenCalledWith({ nodeId: { diagnostics: [] } });
      expect(messages.length).toEqual(0);
      expect(topics).toEqual(["/np_input", `${DEFAULT_WEBVIZ_NODE_PREFIX}1`]);
    });

    it("gets memoized version of messages if they have not changed", async () => {
      const fakePlayer = new FakePlayer();
      const mockAddUserNodeLogs = jest.fn();
      const userNodePlayer = new UserNodePlayer(fakePlayer, {
        ...defaultUserNodeActions,
        setUserNodeDiagnostics: jest.fn(),
        addUserNodeLogs: mockAddUserNodeLogs,
      });

      await trustUserNode({ id: nodeId, sourceCode: `${nodeUserCode}\nlog("LOG VALUE HERE");` });
      userNodePlayer.setSubscriptions([{ topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}1` }]);
      userNodePlayer.setUserNodes({
        nodeId: { name: "someNodeName", sourceCode: `${nodeUserCode}\nlog("LOG VALUE HERE");` },
      });

      const messagesArray = [upstreamMessages[0]];

      const [done, nextDone] = setListenerHelper(userNodePlayer, 2);

      fakePlayer.emit({
        ...basicPlayerState,
        messages: messagesArray,
        currentTime: { sec: 0, nsec: 0 },
        topics: [{ name: "/np_input", datatype: `${DEFAULT_WEBVIZ_NODE_PREFIX}1` }],
        datatypes: { foo: { fields: [] } },
      });

      const { messages } = await done;

      fakePlayer.emit({
        ...basicPlayerState,
        messages: messagesArray,
        currentTime: { sec: 0, nsec: 0 },
        topics: [{ name: "/np_input", datatype: `${DEFAULT_WEBVIZ_NODE_PREFIX}1` }],
        datatypes: { foo: { fields: [] } },
      });

      const { messages: newMessages } = await nextDone;

      // Node was run once with first set of messages,
      // which includes 2 invocations of addUserNodeLogs in processMessage function
      expect(mockAddUserNodeLogs).toHaveBeenCalledTimes(2);
      expect(messages).toBe(newMessages);
    });

    it("subscribes to underlying topics when nodeInfo is added", async () => {
      const fakePlayer = new FakePlayer();
      const userNodePlayer = new UserNodePlayer(fakePlayer, defaultUserNodeActions);

      const [done] = setListenerHelper(userNodePlayer);

      fakePlayer.emit({
        ...basicPlayerState,
        messages: [],
        currentTime: { sec: 0, nsec: 0 },
        topics: [{ name: "/np_input", datatype: "std_msgs/Header" }],
        datatypes: { foo: { fields: [] } },
      });

      const { topics } = await done;
      userNodePlayer.setUserNodes({ nodeId: { name: "someNodeName", sourceCode: nodeUserCode } });
      userNodePlayer.setSubscriptions(topics.map((topic) => ({ topic })));
      expect(fakePlayer.subscriptions).toEqual([{ topic: "/np_input" }]);
    });

    it("does not produce messages from UserNodes if not subscribed to", async () => {
      const fakePlayer = new FakePlayer();
      const userNodePlayer = new UserNodePlayer(fakePlayer, defaultUserNodeActions);

      const [done] = setListenerHelper(userNodePlayer);

      await trustUserNode({ id: nodeId, sourceCode: nodeUserCode });
      userNodePlayer.setUserNodes({
        [nodeId]: { name: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, sourceCode: nodeUserCode },
      });

      fakePlayer.emit({
        ...basicPlayerState,
        messages: [upstreamMessages[0]],
        currentTime: upstreamMessages[0].receiveTime,
        topics: [{ name: "/np_input", datatype: "std_msgs/Header" }],
        datatypes: { foo: { fields: [] } },
      });

      const { messages, topics } = await done;
      expect(topics).toEqual(["/np_input", `${DEFAULT_WEBVIZ_NODE_PREFIX}1`]);
      expect(messages).toEqual([upstreamMessages[0]]);
    });

    it("produces messages from user input node code with messages produced from underlying player", async () => {
      const fakePlayer = new FakePlayer();
      const userNodePlayer = new UserNodePlayer(fakePlayer, defaultUserNodeActions);

      const [done] = setListenerHelper(userNodePlayer);

      await trustUserNode({ id: nodeId, sourceCode: nodeUserCode });
      // TODO: test here to make sure the user node does not produce messages if not subscribed to.
      userNodePlayer.setSubscriptions([{ topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}1` }]);
      await userNodePlayer.setUserNodes({
        [nodeId]: { name: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, sourceCode: nodeUserCode },
      });

      fakePlayer.emit({
        ...basicPlayerState,
        messages: [upstreamMessages[0]],
        currentTime: upstreamMessages[0].receiveTime,
        topics: [{ name: "/np_input", datatype: "std_msgs/Header" }],
        datatypes: { foo: { fields: [] } },
      });

      const { messages } = await done;

      expect(messages).toEqual([
        upstreamMessages[0],
        {
          datatype: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`,
          op: "message",
          receiveTime: upstreamMessages[0].receiveTime,
          message: { custom_np_field: "abc", value: "bar" },
          topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`,
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

      await trustUserNode({ id: nodeId, sourceCode: unionTypeReturn });
      // TODO: test here to make sure the user node does not produce messages if not subscribed to.
      userNodePlayer.setSubscriptions([{ topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}1` }]);
      await userNodePlayer.setUserNodes({
        [nodeId]: { name: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, sourceCode: unionTypeReturn },
      });

      fakePlayer.emit({
        ...basicPlayerState,
        messages: [upstreamMessages[0]],
        currentTime: upstreamMessages[0].receiveTime,
        topics: [{ name: "/np_input", datatype: "std_msgs/Header" }],
        datatypes: { foo: { fields: [] } },
      });

      const result = await done;
      expect(result.messages).toEqual([upstreamMessages[0]]);

      fakePlayer.emit({
        ...basicPlayerState,
        messages: [upstreamMessages[1]],
        currentTime: upstreamMessages[1].receiveTime,
        topics: [{ name: "/np_input", datatype: "std_msgs/Header" }],
        datatypes: { foo: { fields: [] } },
      });

      const nextResult = await nextDone;
      expect(nextResult.messages).toEqual([
        upstreamMessages[1],
        {
          datatype: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`,
          op: "message",
          receiveTime: upstreamMessages[1].receiveTime,
          message: { custom_np_field: "abc", value: "baz" },
          topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`,
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

      await trustUserNode({ id: nodeId, sourceCode: nodeUserCode });

      const nodeUserCode2 = nodeUserCode.replace(`${DEFAULT_WEBVIZ_NODE_PREFIX}1`, `${DEFAULT_WEBVIZ_NODE_PREFIX}2`);
      await trustUserNode({ id: `${nodeId}2`, sourceCode: nodeUserCode2 });
      userNodePlayer.setUserNodes({
        [nodeId]: { name: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, sourceCode: nodeUserCode },
        [`${nodeId}2`]: {
          name: `${DEFAULT_WEBVIZ_NODE_PREFIX}2`,
          sourceCode: nodeUserCode2,
        },
      });

      userNodePlayer.setSubscriptions([
        { topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}1` },
        { topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}2` },
      ]);

      fakePlayer.emit({
        ...basicPlayerState,
        messages: [upstreamMessages[0]],
        currentTime: upstreamMessages[0].receiveTime,
        topics: [{ name: "/np_input", datatype: "std_msgs/Header" }],
        datatypes: { foo: { fields: [] } },
      });

      const { messages } = await done;

      expect(messages.length).toEqual(3);
      expect(messages).toEqual([
        upstreamMessages[0],
        {
          datatype: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`,
          op: "message",
          receiveTime: upstreamMessages[0].receiveTime,
          message: { custom_np_field: "abc", value: "bar" },
          topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`,
        },
        {
          datatype: `${DEFAULT_WEBVIZ_NODE_PREFIX}2`,
          op: "message",
          receiveTime: upstreamMessages[0].receiveTime,
          message: { custom_np_field: "abc", value: "bar" },
          topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}2`,
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

      await trustUserNode({ id: nodeId, sourceCode });
      userNodePlayer.setUserNodes({
        [nodeId]: { name: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, sourceCode },
      });

      userNodePlayer.setSubscriptions([{ topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}1` }]);

      const [firstDone, secondDone] = setListenerHelper(userNodePlayer, 2);

      fakePlayer.emit({
        ...basicPlayerState,
        messages: [upstreamMessages[0]],
        currentTime: upstreamMessages[0].receiveTime,
        topics: [{ name: "/np_input", datatype: "std_msgs/Header" }],
        datatypes: { foo: { fields: [] } },
      });

      await firstDone;

      fakePlayer.emit({
        ...basicPlayerState,
        messages: [upstreamMessages[1]],
        currentTime: upstreamMessages[1].receiveTime,
        lastSeekTime: 1,
        topics: [{ name: "/np_input", datatype: "std_msgs/Header" }],
        datatypes: { foo: { fields: [] } },
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

      await trustUserNode({ id: nodeId, sourceCode: code });
      userNodePlayer.setSubscriptions([{ topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}1` }]);
      userNodePlayer.setUserNodes({ nodeId: { name: "nodeName", sourceCode: code } });

      const [done] = setListenerHelper(userNodePlayer);

      fakePlayer.emit({
        ...basicPlayerState,
        messages: [upstreamMessages[0]],
        currentTime: upstreamMessages[0].receiveTime,
        topics: [{ name: "/np_input", datatype: "std_msgs/Header" }],
        datatypes: { foo: { fields: [] } },
      });

      const { topics, messages } = await done;
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
      expect(topics).toEqual(["/np_input", `${DEFAULT_WEBVIZ_NODE_PREFIX}1`]);
    });

    it("properly clears user node registrations", async () => {
      const fakePlayer = new FakePlayer();
      const userNodePlayer = new UserNodePlayer(fakePlayer, defaultUserNodeActions);

      await trustUserNode({ id: nodeId, sourceCode: nodeUserCode });
      userNodePlayer.setUserNodes({
        [nodeId]: { name: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, sourceCode: nodeUserCode },
      });

      const [firstDone, secondDone] = setListenerHelper(userNodePlayer, 2);

      fakePlayer.emit({
        ...basicPlayerState,
        messages: [upstreamMessages[0]],
        currentTime: upstreamMessages[0].receiveTime,
        topics: [{ name: "/np_input", datatype: "std_msgs/Header" }],
        datatypes: { foo: { fields: [] } },
      });

      const { topics: firstTopics } = await firstDone;
      expect(firstTopics).toEqual(["/np_input", `${DEFAULT_WEBVIZ_NODE_PREFIX}1`]);

      userNodePlayer.setUserNodes({});
      fakePlayer.emit({
        ...basicPlayerState,
        messages: [upstreamMessages[0]],
        currentTime: upstreamMessages[0].receiveTime,
        topics: [{ name: "/np_input", datatype: "std_msgs/Header" }],
        datatypes: { foo: { fields: [] } },
      });
      const { topics: secondTopics } = await secondDone;
      expect(secondTopics).toEqual(["/np_input"]);
    });

    describe("user logging", () => {
      it("records logs in the logs handler", async () => {
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

        await trustUserNode({ id: nodeId, sourceCode: code });
        userNodePlayer.setSubscriptions([{ topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}1` }]);
        userNodePlayer.setUserNodes({ [nodeId]: { name: "nodeName", sourceCode: code } });

        fakePlayer.emit({
          ...basicPlayerState,
          messages: [upstreamMessages[0]],
          currentTime: upstreamMessages[0].receiveTime,
          topics: [{ name: "/np_input", datatype: "std_msgs/Header" }],
          datatypes: { foo: { fields: [] } },
        });

        const { topics } = await done;
        expect(mockAddNodeLogs).toHaveBeenCalled();
        expect(mockAddNodeLogs.mock.calls).toEqual(logs.map((log) => [{ nodeId: { logs: log } }]));
        expect(topics).toEqual(["/np_input", `${DEFAULT_WEBVIZ_NODE_PREFIX}1`]);
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
          currentTime: upstreamMessages[0].receiveTime,
          topics: [{ name: "/np_input", datatype: "std_msgs/Header" }],
          datatypes: { foo: { fields: [] } },
        });

        userNodePlayer.setSubscriptions([{ topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}1` }]);
        userNodePlayer.setUserNodes({ nodeId: { name: "nodeName", sourceCode: code } });

        const { topics } = await done;
        expect(mockAddNodeLogs.mock.calls).toEqual([]);
        expect(topics).toEqual(["/np_input"]);
      });
    });

    describe("Node Security", () => {
      beforeEach(() => {
        global.wasExecuted = false;
        window.localStorage.clear();
      });

      afterAll(() => {
        delete global.wasExecuted;
        window.localStorage.clear();
      });

      const attemptToExecute = async (id: string, code: string, mockSetUserNodeTrust: SetUserNodeTrust = jest.fn()) => {
        const fakePlayer = new FakePlayer();
        const mockSetNodeDiagnostics = jest.fn();
        const userNodePlayer = new UserNodePlayer(fakePlayer, {
          ...defaultUserNodeActions,
          setUserNodeDiagnostics: mockSetNodeDiagnostics,
          setUserNodeTrust: mockSetUserNodeTrust,
        });
        const [done] = setListenerHelper(userNodePlayer);

        // This will trigger the node to register
        userNodePlayer.setUserNodes({ [id]: { name: "nodeName", sourceCode: code } });
        userNodePlayer.setSubscriptions([{ topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}1` }]);

        fakePlayer.emit({
          ...basicPlayerState,
          messages: [upstreamMessages[0]],
          currentTime: upstreamMessages[0].receiveTime,
          topics: [{ name: "/np_input", datatype: "std_msgs/Header" }],
          datatypes: { foo: { fields: [] } },
        });

        await done;
      };

      it("does not execute nodes that have not been explicitly approved", async () => {
        const sourceCode = `
          // @ts-ignore
          global.wasExecuted = true;
          export const inputs = ["/np_input"];
          export const output = "${DEFAULT_WEBVIZ_NODE_PREFIX}1";
          export default (message: any): { str: string } => {
            return { str: '' };
          };
        `;

        await attemptToExecute("mock_id", sourceCode);
        expect(global.wasExecuted).toEqual(false);
      });

      it("executes nodes that have been explicitly approved", async () => {
        const id = "mock_id";
        const sourceCode = `
          // @ts-ignore
          global.wasExecuted = true;
          export const inputs = ["/np_input"];
          export const output = "${DEFAULT_WEBVIZ_NODE_PREFIX}1";
          export default (message: any): { str: string } => {
            return { str: '' };
          };
        `;

        await trustUserNode({ id, sourceCode });
        await attemptToExecute(id, sourceCode);
        expect(global.wasExecuted).toEqual(true);
      });

      it("flags nodes as a security risk that have not been approved", async () => {
        const id = "mock_id";
        const sourceCode = `
          // @ts-ignore
          global.wasExecuted = true;
          export const inputs = ["/np_input"];
          export const output = "${DEFAULT_WEBVIZ_NODE_PREFIX}1";
          export default (message: any): { str: string } => {
            return { str: '' };
          };
        `;

        const mockSetUserNodeTrust = jest.fn();
        await attemptToExecute(id, sourceCode, mockSetUserNodeTrust);
        expect(global.wasExecuted).toEqual(false);
        expect(mockSetUserNodeTrust).toHaveBeenCalledWith({ id, trusted: false });
      });

      it("flags nodes as secure if the user explicitly trusts them", async () => {
        const id = "mock_id";
        const sourceCode = `
          // @ts-ignore
          global.wasExecuted = true;
          export const inputs = ["/np_input"];
          export const output = "${DEFAULT_WEBVIZ_NODE_PREFIX}1";
          export default (message: any): { str: string } => {
            return { str: '' };
          };
        `;

        const mockSetUserNodeTrust = jest.fn();

        const fakePlayer = new FakePlayer();
        const mockSetNodeDiagnostics = jest.fn();
        const userNodePlayer = new UserNodePlayer(fakePlayer, {
          ...defaultUserNodeActions,
          setUserNodeDiagnostics: mockSetNodeDiagnostics,
          setUserNodeTrust: mockSetUserNodeTrust,
        });
        const [done, nextDone] = setListenerHelper(userNodePlayer, 2);

        // These actions will trigger the node to register
        userNodePlayer.setUserNodes({ [id]: { name: "nodeName", sourceCode } });
        userNodePlayer.setSubscriptions([{ topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}1` }]);

        fakePlayer.emit({
          ...basicPlayerState,
          messages: [upstreamMessages[0]],
          currentTime: upstreamMessages[0].receiveTime,
          topics: [{ name: "/np_input", datatype: "std_msgs/Header" }],
          datatypes: { foo: { fields: [] } },
        });

        await done;

        expect(global.wasExecuted).toEqual(false);
        expect(mockSetUserNodeTrust).toHaveBeenLastCalledWith({ id, trusted: false });

        // Simulate user clicking 'trust'
        await trustUserNode({ id, sourceCode });
        // Trigger workers to reset.
        await userNodePlayer.setUserNodes({ [id]: { name: "nodeName", sourceCode } });

        fakePlayer.emit({
          ...basicPlayerState,
          messages: [upstreamMessages[0]],
          currentTime: upstreamMessages[0].receiveTime,
          topics: [{ name: "/np_input", datatype: "std_msgs/Header" }],
          datatypes: { foo: { fields: [] } },
        });

        await nextDone;

        expect(global.wasExecuted).toEqual(true);
        expect(mockSetUserNodeTrust).toHaveBeenLastCalledWith({ id, trusted: true });
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

        await trustUserNode({ id: nodeId, sourceCode });
        userNodePlayer.setUserNodes({
          [nodeId]: { name: firstName, sourceCode },
        });
        userNodePlayer.setSubscriptions([{ topic: firstName }]);

        // Update the name of the node.
        const secondName = `${DEFAULT_WEBVIZ_NODE_PREFIX}state`;
        const secondSourceCode = sourceCode.replace(/innerState/g, "state");

        await trustUserNode({ id: nodeId, sourceCode: secondSourceCode });
        userNodePlayer.setUserNodes({
          [nodeId]: {
            name: secondName,
            sourceCode: secondSourceCode,
          },
        });
        userNodePlayer.setSubscriptions([{ topic: secondName }]);

        const [done] = setListenerHelper(userNodePlayer);

        fakePlayer.emit({
          ...basicPlayerState,
          messages: [upstreamMessages[0]],
          currentTime: upstreamMessages[0].receiveTime,
          topics: [{ name: "/np_input", datatype: "std_msgs/Header" }],
          datatypes: { foo: { fields: [] } },
        });

        const { messages } = await done;

        expect(messages[messages.length - 1].datatype).toEqual(`${DEFAULT_WEBVIZ_NODE_PREFIX}state`);
      });
    });
  });
});
