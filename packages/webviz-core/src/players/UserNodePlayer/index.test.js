// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { setNodeDiagnostics } from "webviz-core/src/actions/nodeDiagnostics";
import FakePlayer from "webviz-core/src/components/MessagePipeline/FakePlayer";
import UserNodePlayer from "webviz-core/src/players/UserNodePlayer";
import { registerNode, processMessage } from "webviz-core/src/players/UserNodePlayer/nodeRuntimeWorker/registry";
import transform from "webviz-core/src/players/UserNodePlayer/nodeTransformerWorker/transformer";
import { DEFAULT_WEBVIZ_NODE_PREFIX } from "webviz-core/src/util/globalConstants";
import Rpc from "webviz-core/src/util/Rpc";
import signal from "webviz-core/src/util/signal";

const nodeUserCode = `
  export const inputs = ["/np_input"];
  export const output = "${DEFAULT_WEBVIZ_NODE_PREFIX}1";
  let lastStamp, lastReceiveTime;
  export default (message) => {
    return { custom_np_field: "abc", value: message.message.payload };
  };
`;

jest.mock("webviz-core/src/util/Rpc", () =>
  jest.fn().mockImplementation(() => ({
    send: jest.fn(),
    receive: jest.fn(),
  }))
);

describe("UserNodePlayer", () => {
  beforeEach(() => {
    // Simply wires the RpcProvider interface into the user node registry.
    // $FlowFixMe - mocks are hard with flow
    Rpc.mockImplementation(() => ({
      send: (rpc, args) => {
        if (rpc === "registerNode") {
          return registerNode(args);
        }
        if (rpc === "processMessage") {
          return processMessage(args);
        }
        if (rpc === "transform") {
          return transform(args);
        }
      },
    }));
  });

  describe("default player behavior", () => {
    it("subscribes to underlying topics when node topics are subscribed", () => {
      const fakePlayer = new FakePlayer();
      const userNodePlayer = new UserNodePlayer(fakePlayer, setNodeDiagnostics);
      userNodePlayer.setListener(async (playerState) => {});
      userNodePlayer.setSubscriptions([{ topic: "/webviz/test" }, { topic: "/input/baz" }]);
      expect(fakePlayer.subscriptions).toEqual([{ topic: "/webviz/test" }, { topic: "/input/baz" }]);
    });

    it("delegates play and pause calls to underlying player", () => {
      const fakePlayer = new FakePlayer();
      jest.spyOn(fakePlayer, "startPlayback");
      jest.spyOn(fakePlayer, "pausePlayback");
      const userNodePlayer = new UserNodePlayer(fakePlayer, setNodeDiagnostics);
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
      const userNodePlayer = new UserNodePlayer(fakePlayer, setNodeDiagnostics);
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
      const userNodePlayer = new UserNodePlayer(fakePlayer, setNodeDiagnostics);
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
      const userNodePlayer = new UserNodePlayer(fakePlayer, setNodeDiagnostics);
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
      const mockSetUserNodeState = jest.fn();
      const userNodePlayer = new UserNodePlayer(fakePlayer, mockSetUserNodeState);

      userNodePlayer.setUserNodes({ someNodeName: nodeUserCode });

      const [done] = setListenerHelper(userNodePlayer);

      fakePlayer.emit({
        ...basicPlayerState,
        messages: [],
        currentTime: { sec: 0, nsec: 0 },
        topics: [{ name: "/np_input", datatype: "std_msgs/Header" }],
        datatypes: { foo: [] },
      });

      const { topics, messages } = await done;

      expect(mockSetUserNodeState).toHaveBeenCalledWith({ someNodeName: { diagnostics: [] } });
      expect(messages.length).toEqual(0);
      expect(topics).toEqual(["/np_input", "/custom_node/1"]);
    });

    it("subscribes to underlying topics when nodeInfo is added", async () => {
      const fakePlayer = new FakePlayer();
      const userNodePlayer = new UserNodePlayer(fakePlayer, setNodeDiagnostics);

      const [done] = setListenerHelper(userNodePlayer);

      fakePlayer.emit({
        ...basicPlayerState,
        messages: [],
        currentTime: { sec: 0, nsec: 0 },
        topics: [{ name: "/np_input", datatype: "std_msgs/Header" }],
        datatypes: { foo: [] },
      });

      const { topics } = await done;
      userNodePlayer.setUserNodes({ someNodeName: nodeUserCode });
      userNodePlayer.setSubscriptions(topics.map((topic) => ({ topic })));
      expect(fakePlayer.subscriptions).toEqual([{ topic: "/np_input" }]);
    });

    it("does not produce messages from UserNodes if not subscribed to", async () => {
      const fakePlayer = new FakePlayer();
      const userNodePlayer = new UserNodePlayer(fakePlayer, setNodeDiagnostics);

      const [done] = setListenerHelper(userNodePlayer);

      fakePlayer.emit({
        ...basicPlayerState,
        messages: [upstreamMessages[0]],
        currentTime: upstreamMessages[0].receiveTime,
        topics: [{ name: "/np_input", datatype: "std_msgs/Header" }],
        datatypes: { foo: [] },
      });
      userNodePlayer.setUserNodes({
        ["/custom_node/1"]: nodeUserCode,
      });

      const { messages, topics } = await done;
      expect(topics).toEqual(["/np_input", "/custom_node/1"]);
      expect(messages).toEqual([upstreamMessages[0]]);
    });

    it("produces messages from user input node code with messages produced from underlying player", async () => {
      const fakePlayer = new FakePlayer();
      const userNodePlayer = new UserNodePlayer(fakePlayer, setNodeDiagnostics);

      const [done] = setListenerHelper(userNodePlayer);

      fakePlayer.emit({
        ...basicPlayerState,
        messages: [upstreamMessages[0]],
        currentTime: upstreamMessages[0].receiveTime,
        topics: [{ name: "/np_input", datatype: "std_msgs/Header" }],
        datatypes: { foo: [] },
      });

      // TODO: test here to make sure the user node does not produce messages if not subscribed to.
      userNodePlayer.setSubscriptions([{ topic: "/custom_node/1" }]);
      userNodePlayer.setUserNodes({
        ["/custom_node/1"]: nodeUserCode,
      });

      const { messages } = await done;

      expect(messages).toEqual([
        upstreamMessages[0],
        {
          datatype: "std_msgs/Header",
          op: "message",
          receiveTime: upstreamMessages[0].receiveTime,
          message: { custom_np_field: "abc", value: "bar" },
          topic: "/custom_node/1",
        },
      ]);
    });

    it("should handle multiple user nodes", async () => {
      const fakePlayer = new FakePlayer();
      const userNodePlayer = new UserNodePlayer(fakePlayer, setNodeDiagnostics);

      const [done] = setListenerHelper(userNodePlayer);

      userNodePlayer.setUserNodes({
        ["/custom_node/1"]: nodeUserCode,
      });

      userNodePlayer.setUserNodes({
        ["/custom_node/1"]: nodeUserCode,
        ["/custom_node/2"]: nodeUserCode.replace("/custom_node/1", "/custom_node/2"),
      });

      userNodePlayer.setSubscriptions([{ topic: "/custom_node/1" }, { topic: "/custom_node/2" }]);

      fakePlayer.emit({
        ...basicPlayerState,
        messages: [upstreamMessages[0]],
        currentTime: upstreamMessages[0].receiveTime,
        topics: [{ name: "/np_input", datatype: "std_msgs/Header" }],
        datatypes: { foo: [] },
      });

      const { messages } = await done;

      expect(messages.length).toEqual(3);
      expect(messages).toEqual([
        upstreamMessages[0],
        {
          datatype: "std_msgs/Header",
          op: "message",
          receiveTime: upstreamMessages[0].receiveTime,
          message: { custom_np_field: "abc", value: "bar" },
          topic: "/custom_node/1",
        },
        {
          datatype: "std_msgs/Header",
          op: "message",
          receiveTime: upstreamMessages[0].receiveTime,
          message: { custom_np_field: "abc", value: "bar" },
          topic: "/custom_node/2",
        },
      ]);
    });
    it("resets user node state on seek", async () => {
      const code = `
        let innerState = 0;
        export const inputs = ["/np_input"];
        export const output = "${DEFAULT_WEBVIZ_NODE_PREFIX}1";
        export default (message) => {
          innerState += 1;
          return { innerState };
        };
      `;

      const fakePlayer = new FakePlayer();
      const userNodePlayer = new UserNodePlayer(fakePlayer, setNodeDiagnostics);
      userNodePlayer.setUserNodes({
        ["/custom_node/1"]: code,
      });

      userNodePlayer.setSubscriptions([{ topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}1` }]);

      const [firstDone, secondDone] = setListenerHelper(userNodePlayer, 2);

      fakePlayer.emit({
        ...basicPlayerState,
        messages: [upstreamMessages[0]],
        currentTime: upstreamMessages[0].receiveTime,
        topics: [{ name: "/np_input", datatype: "std_msgs/Header" }],
        datatypes: { foo: [] },
      });

      await firstDone;

      fakePlayer.emit({
        ...basicPlayerState,
        messages: [upstreamMessages[1]],
        currentTime: upstreamMessages[1].receiveTime,
        lastSeekTime: 1,
        topics: [{ name: "/np_input", datatype: "std_msgs/Header" }],
        datatypes: { foo: [] },
      });

      const { messages } = await secondDone;

      expect(messages[messages.length - 1].message).toEqual({
        innerState: 1,
      });
    });
  });
});
