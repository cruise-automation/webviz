// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { uniq } from "lodash";
import type { Time } from "rosbag";

import { type NodeDefinition, makeNodeMessage } from "webviz-core/src/pipeline/nodes";
import Pipeline from "webviz-core/src/pipeline/Pipeline";
import MemoryPlayer from "webviz-core/src/test/MemoryPlayer";
import type { Dispatch } from "webviz-core/src/types/Store";

function createDispatch() {
  let handleMessage = (any) => {};
  const dispatch: Dispatch = (message: any) => {
    handleMessage(message);
    return message;
  };
  dispatch.getNextMessage = () => {
    return new Promise((resolve, reject) => {
      handleMessage = resolve;
    });
  };
  return dispatch;
}

const dummyReceiveTime: Time = { sec: 123, nsec: 456 };

const EmptyNode: $Shape<NodeDefinition<void>> = {
  inputs: [],
  outputs: [],
  datatypes: {},
  defaultState: undefined,
  callback() {
    return {
      messages: [],
      state: undefined,
    };
  },
};

const FooNode: NodeDefinition<void> = {
  ...EmptyNode,
  name: "FooNode",
  inputs: ["/some/input/topic"],
  outputs: [{ name: "/webviz/intermediate", datatype: "some_datatype" }],
  callback() {
    return {
      messages: [makeNodeMessage("/webviz/intermediate", "some_datatype", dummyReceiveTime, { foo: "bar" })],
      state: undefined,
    };
  },
};

const LeafNode: NodeDefinition<void> = {
  ...EmptyNode,
  name: "LeafNode",
  inputs: ["/webviz/intermediate"],
  outputs: [{ name: "/webviz/leaf", datatype: "leaf" }],
  callback() {
    return {
      messages: [makeNodeMessage("/webviz/leaf", "leaf", dummyReceiveTime, { foo: "bar" })],
      state: undefined,
    };
  },
};

describe("Pipeline", () => {
  it("subscribes to backend nodes based on webviz node subscription", async () => {
    const source = new MemoryPlayer();
    const pipeline = new Pipeline([FooNode]);
    const dispatch = createDispatch();
    await pipeline.initialize(dispatch, source);
    expect(source.subscriptions).toContainOnly([]);

    const checkSubscriptions = () => {
      expect(uniq(source.subscriptions.map(({ topic }) => topic))).toContainOnly(["/some/input/topic"]);
    };

    pipeline.subscribe({ topic: "/some/input/topic" });
    checkSubscriptions();
    pipeline.subscribe({ topic: "/webviz/intermediate" });
    checkSubscriptions();
    pipeline.subscribe({ topic: "/some/input/topic" });
    checkSubscriptions();
    pipeline.subscribe({ topic: "/webviz/intermediate" });
    checkSubscriptions();

    pipeline.unsubscribe({ topic: "/some/input/topic" });
    pipeline.unsubscribe({ topic: "/some/input/topic" });
    checkSubscriptions();
    pipeline.unsubscribe({ topic: "/webviz/intermediate" });
    checkSubscriptions();
    pipeline.unsubscribe({ topic: "/webviz/intermediate" });
    expect(source.subscriptions).toContainOnly([]);
  });

  it("subcribes to leaf node", async () => {
    const source = new MemoryPlayer();
    const pipeline = new Pipeline([FooNode, LeafNode]);
    const dispatch = createDispatch();
    await pipeline.initialize(dispatch, source);
    expect(source.subscriptions.map(({ topic }) => topic)).toContainOnly([]);
    pipeline.subscribe({ topic: "/webviz/leaf" });
    expect(source.subscriptions.map(({ topic }) => topic)).toContainOnly(["/some/input/topic"]);
    pipeline.subscribe({ topic: "/webviz/intermediate" });
    pipeline.unsubscribe({ topic: "/webviz/leaf" });
    expect(source.subscriptions.map(({ topic }) => topic)).toContainOnly(["/some/input/topic"]);
  });

  it("does not unsubscribe when one of two nodes is disconnected", async () => {
    const source = new MemoryPlayer();
    const pipeline = new Pipeline([FooNode, LeafNode]);
    const dispatch = createDispatch();
    await pipeline.initialize(dispatch, source);
    pipeline.subscribe({ topic: "/webviz/leaf" });
    expect(source.subscriptions.map(({ topic }) => topic)).toContainOnly(["/some/input/topic"]);
    pipeline.subscribe({ topic: "/webviz/leaf" });
    expect(source.subscriptions.map(({ topic }) => topic)).toContainOnly(["/some/input/topic"]);
    pipeline.unsubscribe({ topic: "/webviz/leaf" });
    expect(source.subscriptions.map(({ topic }) => topic)).toContainOnly(["/some/input/topic"]);
  });

  it("subscribes lazily if player is not initialized", async () => {
    const source = new MemoryPlayer();
    const pipeline = new Pipeline([FooNode]);
    const dispatch = createDispatch();
    pipeline.subscribe({ topic: "/webviz/intermediate" });
    pipeline.subscribe({ topic: "/metadata" });
    await pipeline.initialize(dispatch, source);
    expect(uniq(source.subscriptions.map(({ topic }) => topic))).toContainOnly(["/metadata", "/some/input/topic"]);
  });

  it("subscribes new player if it re-initializes", async () => {
    const source = new MemoryPlayer();
    const pipeline = new Pipeline([FooNode]);
    const dispatch = createDispatch();
    pipeline.subscribe({ topic: "/webviz/intermediate" });
    pipeline.subscribe({ topic: "/metadata" });
    await pipeline.initialize(dispatch, source);
    expect(uniq(source.subscriptions.map(({ topic }) => topic))).toContainOnly(["/metadata", "/some/input/topic"]);
    const source2 = new MemoryPlayer();
    pipeline.unsubscribe({ topic: "/metadata" });
    await pipeline.initialize(dispatch, source2);
    expect(uniq(source2.subscriptions.map(({ topic }) => topic))).toContainOnly(["/some/input/topic"]);
  });

  it("tracks node subscriptions and debounces them", async () => {
    const source = new MemoryPlayer();
    const pipeline = new Pipeline([FooNode]);
    const dispatch = createDispatch();
    pipeline.subscribe({ topic: "/webviz/intermediate" });
    pipeline.subscribe({ topic: "/webviz/intermediate" });
    pipeline.unsubscribe({ topic: "/webviz/intermediate" });
    await pipeline.initialize(dispatch, source);
    expect(uniq(source.subscriptions.map(({ topic }) => topic))).toContainOnly(["/some/input/topic"]);
    pipeline.unsubscribe({ topic: "/webviz/intermediate" });
    expect(source.subscriptions).toContainOnly([]);
  });

  it("processes messages on subscribed topics", async () => {
    const source = new MemoryPlayer();
    const pipeline = new Pipeline([]);
    const dispatch = createDispatch();
    await pipeline.initialize(dispatch, source);
    pipeline.subscribe({ topic: "/tf" });
    source.injectFakeMessage({
      op: "message",
      receiveTime: { sec: 0, nsec: 0 },
      topic: "/tf",
      datatype: "whatever",
      message: {
        header: {
          stamp: { sec: 10, nsec: 20 },
        },
      },
    });
    const message = await dispatch.getNextMessage();
    expect(message.type).toEqual("FRAME_RECEIVED");
    const frame = message.frame;
    expect(Object.keys(frame)).toContainOnly(["/tf"]);
  });

  it("includes node topics in player topic responses", async () => {
    const source = new MemoryPlayer();
    const pipeline = new Pipeline([LeafNode]);
    const dispatch = createDispatch();
    await pipeline.initialize(dispatch, source);
    const lastMsg = dispatch.getNextMessage();
    source.injectFakeMessage({
      op: "topics",
      topics: [{ topic: "/foo", datatype: "foo" }, { topic: "/bar", datatype: "bar" }],
    });
    const msg = await lastMsg;
    expect(msg.type).toEqual("TOPICS_RECEIVED");
    expect(msg.payload).toContainOnly([
      {
        name: "/foo",
        datatype: "foo",
      },
      {
        name: "/bar",
        datatype: "bar",
      },
      {
        name: "/webviz/leaf",
        datatype: "leaf",
      },
    ]);
  });

  it("node registration updates topic list", async () => {
    const source = new MemoryPlayer();
    const pipeline = new Pipeline([]);
    const dispatch = createDispatch();
    await pipeline.initialize(dispatch, source);
    const lastMsg = dispatch.getNextMessage();
    source.injectFakeMessage({
      op: "topics",
      topics: [{ topic: "/foo", datatype: "foo", originalTopic: "/secondary/foo" }, { topic: "/bar", datatype: "bar" }],
    });
    const msg = await lastMsg;
    expect(msg.type).toEqual("TOPICS_RECEIVED");
    expect(msg.payload).toContainOnly([
      {
        name: "/foo",
        datatype: "foo",
        originalTopic: "/secondary/foo",
      },
      {
        name: "/bar",
        datatype: "bar",
      },
    ]);
  });

  describe("publishing support", () => {
    it("deduplicates advertise/unadvertise calls", async () => {
      const source = new MemoryPlayer();
      const pipeline = new Pipeline();
      const dispatch = createDispatch();
      await pipeline.initialize(dispatch, source);

      pipeline.advertise({ topic: "/foo", datatype: "X", advertiser: { type: "panel", name: "A" } });
      expect(source.publishers).toEqual([expect.objectContaining({ topic: "/foo", datatype: "X" })]);
      pipeline.advertise({ topic: "/foo", datatype: "X", advertiser: { type: "panel", name: "B" } });
      expect(source.publishers).toEqual([expect.objectContaining({ topic: "/foo", datatype: "X" })]);
      pipeline.unadvertise({ topic: "/foo", datatype: "X", advertiser: { type: "panel", name: "A" } });
      expect(source.publishers).toEqual([expect.objectContaining({ topic: "/foo", datatype: "X" })]);
      // nonexistent advertiser
      pipeline.unadvertise({ topic: "/foo", datatype: "X", advertiser: { type: "panel", name: "C" } });
      expect(source.publishers).toEqual([expect.objectContaining({ topic: "/foo", datatype: "X" })]);
      pipeline.unadvertise({ topic: "/foo", datatype: "X", advertiser: { type: "panel", name: "B" } });
      expect(source.publishers).toEqual([]);
    });
  });
});
