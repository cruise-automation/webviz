// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { Time } from "rosbag";

import { makeNodeMessage, type NodeDefinition } from "webviz-core/src/pipeline/Node";
import NodeManager from "webviz-core/src/pipeline/NodeManager";
import Pipeline from "webviz-core/src/pipeline/Pipeline";
import MemoryDatasource from "webviz-core/src/test/MemoryDataSource";
import type { Timestamp } from "webviz-core/src/types/dataSources";
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

const dummyReceiveTime: Timestamp = { sec: 123, nsec: 456 };

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
    const source = new MemoryDatasource();
    const nodeMgmr = new NodeManager([FooNode]);
    const pipeline = new Pipeline(nodeMgmr);
    const dispatch = createDispatch();
    await pipeline.initialize(dispatch, source);
    expect(source.subscriptions).toContainOnly([]);

    const checkSubscriptions = () => {
      expect(source.subscriptions).toContainOnly([{ topic: "/some/input/topic" }]);
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
    const source = new MemoryDatasource();
    const nodeMgmr = new NodeManager([FooNode, LeafNode]);
    const pipeline = new Pipeline(nodeMgmr);
    const dispatch = createDispatch();
    await pipeline.initialize(dispatch, source);
    expect(source.subscriptions).toContainOnly([]);
    pipeline.subscribe({ topic: "/webviz/leaf" });
    expect(source.subscriptions).toContainOnly([{ topic: "/some/input/topic" }]);
    pipeline.subscribe({ topic: "/webviz/intermediate" });
    pipeline.unsubscribe({ topic: "/webviz/leaf" });
    expect(source.subscriptions).toContainOnly([{ topic: "/some/input/topic" }]);
  });

  it("does not unsubscribe when one of two nodes is disconnected", async () => {
    const source = new MemoryDatasource();
    const nodeMgmr = new NodeManager([FooNode, LeafNode]);
    const pipeline = new Pipeline(nodeMgmr);
    const dispatch = createDispatch();
    await pipeline.initialize(dispatch, source);
    pipeline.subscribe({ topic: "/webviz/leaf" });
    expect(source.subscriptions).toContainOnly([{ topic: "/some/input/topic" }]);
    pipeline.subscribe({ topic: "/webviz/leaf" });
    expect(source.subscriptions).toContainOnly([{ topic: "/some/input/topic" }]);
    pipeline.unsubscribe({ topic: "/webviz/leaf" });
    expect(source.subscriptions).toContainOnly([{ topic: "/some/input/topic" }]);
  });

  it("subscribes lazily if datasource is not initialized", async () => {
    const source = new MemoryDatasource();
    const nodeMgmr = new NodeManager([FooNode]);
    const pipeline = new Pipeline(nodeMgmr);
    const dispatch = createDispatch();
    pipeline.subscribe({ topic: "/webviz/intermediate" });
    pipeline.subscribe({ topic: "/metadata" });
    await pipeline.initialize(dispatch, source);
    expect(source.subscriptions).toContainOnly([{ topic: "/metadata" }, { topic: "/some/input/topic" }]);
  });

  it("subscribes new datasource if it re-initializes", async () => {
    const source = new MemoryDatasource();
    const nodeMgmr = new NodeManager([FooNode]);
    const pipeline = new Pipeline(nodeMgmr);
    const dispatch = createDispatch();
    pipeline.subscribe({ topic: "/webviz/intermediate" });
    pipeline.subscribe({ topic: "/metadata" });
    await pipeline.initialize(dispatch, source);
    expect(source.subscriptions).toContainOnly([{ topic: "/metadata" }, { topic: "/some/input/topic" }]);
    const source2 = new MemoryDatasource();
    pipeline.unsubscribe({ topic: "/metadata" });
    await pipeline.initialize(dispatch, source2);
    expect(source2.subscriptions).toContainOnly([{ topic: "/some/input/topic" }]);
  });

  it("tracks node subscriptions and debounces them", async () => {
    const source = new MemoryDatasource();
    const nodeMgmr = new NodeManager([FooNode]);
    const pipeline = new Pipeline(nodeMgmr);
    const dispatch = createDispatch();
    pipeline.subscribe({ topic: "/webviz/intermediate" });
    pipeline.subscribe({ topic: "/webviz/intermediate" });
    pipeline.unsubscribe({ topic: "/webviz/intermediate" });
    await pipeline.initialize(dispatch, source);
    expect(source.subscriptions).toContainOnly([{ topic: "/some/input/topic" }]);
    pipeline.unsubscribe({ topic: "/webviz/intermediate" });
    expect(source.subscriptions).toContainOnly([]);
  });

  it("processes messages on subscribed topics", async () => {
    const source = new MemoryDatasource();
    const nodeMgmr = new NodeManager([]);
    const pipeline = new Pipeline(nodeMgmr);
    const dispatch = createDispatch();
    await pipeline.initialize(dispatch, source);
    pipeline.subscribe({ topic: "/tf" });
    source.injectFakeMessage({
      op: "message",
      receiveTime: new Time(0, 0),
      topic: "/tf",
      datatype: "whatever",
      message: {
        header: {
          stamp: new Time(10, 20),
        },
      },
    });
    const message = await dispatch.getNextMessage();
    expect(message.type).toEqual("FRAME_RECEIVED");
    const frame = message.frame;
    expect(Object.keys(frame)).toContainOnly(["/tf"]);
  });

  it("includes node topics in datasource topic responses", async () => {
    const source = new MemoryDatasource();
    const nodeMgmr = new NodeManager([LeafNode]);
    const pipeline = new Pipeline(nodeMgmr);
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
    const source = new MemoryDatasource();
    const nodeMgmr = new NodeManager([]);
    const pipeline = new Pipeline(nodeMgmr);
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
    ]);
  });

  describe("internal topics", () => {
    const initializePipeline = async (nodeDefinitions) => {
      const source = new MemoryDatasource();
      const manager = new NodeManager(nodeDefinitions);
      const pipeline = new Pipeline(manager);
      const dispatch = createDispatch();
      await pipeline.initialize(dispatch, source);
      return { pipeline, manager, source };
    };

    it("does not call consume on internal nodes until they have been subscribed to", async () => {
      const mockCallback = jest.fn().mockReturnValue({ messages: [], state: undefined });
      const MockSingleNode: NodeDefinition<void> = {
        ...EmptyNode,
        name: "MockSingleNode",
        inputs: ["/tf"],
        outputs: [{ name: "/webviz/intermediate", datatype: "some_datatype" }],
        callback: mockCallback,
      };
      const { pipeline, source } = await initializePipeline([MockSingleNode]);
      const message = {
        op: "message",
        receiveTime: new Time(0, 0),
        topic: "/tf",
        datatype: "whatever",
        message: {
          header: {
            stamp: new Time(10, 20),
          },
        },
      };
      source.injectFakeMessage(message);
      expect(mockCallback).not.toHaveBeenCalled();
      pipeline.subscribe({ topic: "/webviz/intermediate" });
      source.injectFakeMessage(message);
      expect(mockCallback).toHaveBeenCalled();
    });
    it("should subscribe to an internal node if it is a dependency from another node that was subscribed to explicitly", async () => {
      const mockDependencyCallback = jest.fn().mockReturnValue({
        messages: [makeNodeMessage("/webviz/dependent", "some_datatype", dummyReceiveTime, { foo: "bar" })],
        state: undefined,
      });
      const MockDependencyNode: NodeDefinition<void> = {
        ...EmptyNode,
        name: "MockDependencyNode",
        inputs: ["/webviz/independent"],
        outputs: [{ name: "/webviz/dependent", datatype: "some_datatype" }],
        callback: mockDependencyCallback,
      };

      const mockCallback = jest.fn().mockReturnValue({
        messages: [makeNodeMessage("/webviz/independent", "some_datatype", dummyReceiveTime, { foo: "bar" })],
        state: undefined,
      });
      const MockNode: NodeDefinition<void> = {
        ...EmptyNode,
        name: "MockNode",
        inputs: ["/webviz/intermediate"],
        outputs: [{ name: "/webviz/independent", datatype: "some_datatype" }],
        callback: mockCallback,
      };

      const { pipeline, source } = await initializePipeline([MockDependencyNode, MockNode]);
      const message = {
        op: "message",
        receiveTime: new Time(0, 0),
        topic: "/webviz/intermediate",
        datatype: "whatever",
        message: {
          header: {
            stamp: new Time(10, 20),
          },
        },
      };

      pipeline.subscribe({ topic: "/webviz/dependent", requester: { type: "panel", name: "test" } });
      expect(pipeline.getUniqueInternalSubscriptions()).toContainOnly([
        { topic: "/webviz/dependent", requester: { type: "panel", name: "test" } },
        { topic: "/webviz/independent", requester: { name: "MockDependencyNode", type: "node" } },
      ]);
      source.injectFakeMessage(message);

      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockDependencyCallback).toHaveBeenCalledTimes(1);
      pipeline.unsubscribe({ topic: "/webviz/dependent", requester: { type: "panel", name: "test" } });
      expect(pipeline.getUniqueInternalSubscriptions()).toEqual([]);

      source.injectFakeMessage(message);
      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockDependencyCallback).toHaveBeenCalledTimes(1);
    });

    it("should subscribe to external topics from nested dependencies", async () => {
      const MockDependencyNode: NodeDefinition<void> = {
        ...EmptyNode,
        name: "MockDependencyNode",
        inputs: ["/webviz/independent"],
        outputs: [{ name: "/webviz/dependent", datatype: "some_datatype" }],
      };
      const MockNode: NodeDefinition<void> = {
        ...EmptyNode,
        name: "MockNode",
        inputs: ["/another/input"],
        outputs: [{ name: "/webviz/independent", datatype: "some_datatype" }],
      };
      const { manager, pipeline, source } = await initializePipeline([MockDependencyNode, MockNode]);
      pipeline.subscribe({ topic: "/webviz/dependent" });
      pipeline.subscribe({ topic: "/webviz/dependent" });
      expect(source.subscriptions).toContainOnly([{ topic: "/another/input" }]);
      expect(pipeline.getUniqueInternalSubscriptions()).toContainOnly([
        { topic: "/webviz/dependent" },
        { topic: "/webviz/independent", requester: { name: "MockDependencyNode", type: "node" } },
      ]);
      expect(manager.getSubscribedNodes().map(({ name }) => name)).toContainOnly(["MockDependencyNode", "MockNode"]);
      pipeline.unsubscribe({ topic: "/webviz/dependent" });
      pipeline.unsubscribe({ topic: "/webviz/dependent" });
      expect(source.subscriptions).toContainOnly([]);
      expect(pipeline.getUniqueInternalSubscriptions()).toEqual([]);
      expect(manager.getSubscribedNodes()).toContainOnly([]);
      expect(pipeline.getAllSubscriptions()).toEqual([]);
    });
    it("will not unsubscribe from an external subscription if two nodes depend on it and only one of the nodes is unsubscribed", async () => {
      const MockNodeOne: NodeDefinition<void> = {
        ...EmptyNode,
        name: "MockNodeOne",
        inputs: ["/another/input"],
        outputs: [{ name: "/webviz/one", datatype: "some_datatype" }],
      };
      const MockNodeTwo: NodeDefinition<void> = {
        ...EmptyNode,
        name: "MockNodeTwo",
        inputs: ["/another/input"],
        outputs: [{ name: "/webviz/two", datatype: "some_datatype" }],
      };
      const { pipeline, source } = await initializePipeline([MockNodeOne, MockNodeTwo]);
      pipeline.subscribe({ topic: "/webviz/one" });
      expect(source.subscriptions).toContainOnly([{ topic: "/another/input" }]);

      pipeline.subscribe({ topic: "/webviz/two" });
      expect(source.subscriptions).toContainOnly([{ topic: "/another/input" }]);

      pipeline.unsubscribe({ topic: "/webviz/two" });
      expect(source.subscriptions).toContainOnly([{ topic: "/another/input" }]);

      pipeline.unsubscribe({ topic: "/webviz/one" });
      expect(pipeline.getAllSubscriptions()).toContainOnly([]);
    });
    it("unsubscribes from all nested internal and external dependencies", async () => {
      const MockNodeOne: NodeDefinition<void> = {
        ...EmptyNode,
        name: "MockNodeOne",
        inputs: ["/another/input"],
        outputs: [{ name: "/webviz/one", datatype: "some_datatype" }],
      };
      const MockNodeTwo: NodeDefinition<void> = {
        ...EmptyNode,
        name: "MockNodeTwo",
        inputs: ["/webviz/one"],
        outputs: [{ name: "/webviz/two", datatype: "some_datatype" }],
      };
      const MockNodeThree: NodeDefinition<void> = {
        ...EmptyNode,
        name: "MockNodeThree",
        inputs: ["/webviz/two"],
        outputs: [{ name: "/webviz/three", datatype: "some_datatype" }],
      };
      const { pipeline, source } = await initializePipeline([MockNodeOne, MockNodeTwo, MockNodeThree]);
      expect(pipeline.getUniqueInternalSubscriptions()).toEqual([]);

      pipeline.subscribe({ topic: "/webviz/three" });
      expect(source.subscriptions).toContainOnly([{ topic: "/another/input" }]);
      expect(pipeline.getUniqueInternalSubscriptions()).toContainOnly([
        { topic: "/webviz/three" },
        { topic: "/webviz/two", requester: { name: "MockNodeThree", type: "node" } },
        { topic: "/webviz/one", requester: { name: "MockNodeTwo", type: "node" } },
      ]);

      pipeline.unsubscribe({ topic: "/webviz/three" });
      expect(source.subscriptions).toContainOnly([]);
      expect(pipeline.getUniqueInternalSubscriptions()).toEqual([]);
      expect(pipeline.getAllSubscriptions()).toContainOnly([]);
    });
  });

  describe("publishing support", () => {
    it("deduplicates advertise/unadvertise calls", async () => {
      const source = new MemoryDatasource();
      const pipeline = new Pipeline();
      const dispatch = createDispatch();
      await pipeline.initialize(dispatch, source);

      pipeline.advertise({ topic: "/foo", datatype: "X", advertiser: { type: "panel", name: "A" } });
      expect(source.publishers).toEqual([{ topic: "/foo", datatype: "X" }]);
      pipeline.advertise({ topic: "/foo", datatype: "X", advertiser: { type: "panel", name: "B" } });
      expect(source.publishers).toEqual([{ topic: "/foo", datatype: "X" }]);
      pipeline.unadvertise({ topic: "/foo", datatype: "X", advertiser: { type: "panel", name: "A" } });
      expect(source.publishers).toEqual([{ topic: "/foo", datatype: "X" }]);
      // nonexistent advertiser
      pipeline.unadvertise({ topic: "/foo", datatype: "X", advertiser: { type: "panel", name: "C" } });
      expect(source.publishers).toEqual([{ topic: "/foo", datatype: "X" }]);
      pipeline.unadvertise({ topic: "/foo", datatype: "X", advertiser: { type: "panel", name: "B" } });
      expect(source.publishers).toEqual([]);
    });
  });
});
