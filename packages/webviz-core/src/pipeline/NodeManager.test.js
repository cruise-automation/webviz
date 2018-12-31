// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import NodeManager from "./NodeManager";
import { makeNodeMessage, type NodeDefinition } from "webviz-core/src/pipeline/Node";
import type { Message, Timestamp } from "webviz-core/src/types/dataSources";

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

const BarNode: NodeDefinition<{| count: number |}> = {
  name: "BarNode",
  inputs: ["/webviz/foo"],
  outputs: [{ name: "/webviz/bar", datatype: "webviz/Bar" }],
  datatypes: { "webviz/Bar": [{ type: "string", name: "bar " }] },
  defaultState: { count: 0 },
  callback({ message, state }) {
    if (message.topic !== "/webviz/foo") {
      throw new Error(`unexpected topic in FooNode ${message.topic}`);
    }
    return {
      messages: [makeNodeMessage("/webviz/bar", "webviz/Bar", dummyReceiveTime, { count: state.count })],
      state: { count: state.count + 1 },
    };
  },
};

const BazNode: NodeDefinition<{| count: number |}> = {
  name: "BazNode",
  inputs: ["/webviz/bar"],
  outputs: [{ name: "/webviz/baz", datatype: "webviz/Baz" }],
  datatypes: { "webviz/Baz": [{ type: "string", name: "baz" }] },
  defaultState: { count: 0 },
  callback({ message, state }) {
    if (message.topic !== "/webviz/bar") {
      throw new Error(`unexpected topic in BarNode ${message.topic}`);
    }
    return {
      messages: [
        makeNodeMessage("/webviz/baz", "webviz/Baz", dummyReceiveTime, { count: state.count }),
        makeNodeMessage("/webviz/baz", "webviz/Baz", dummyReceiveTime, { count: state.count + 1 }),
      ],
      state: { count: state.count + 2 },
    };
  },
};

describe("NodeManager", () => {
  it("can consume messages without any nodes", () => {
    const manager = new NodeManager([]);
    manager.consume(makeNodeMessage("/webviz/foo", "webviz/Foo", dummyReceiveTime, {}));
    expect(manager.getAllOutputs()).toHaveLength(0);
  });

  it("can consume with a single child node once subscribed to", () => {
    const manager = new NodeManager([BarNode]);
    const subscriptions = [];
    expect(manager.getAllOutputs()).toHaveLength(1);
    expect(manager.getAllOutputs()).toEqual([{ name: "/webviz/bar", datatype: "webviz/Bar" }]);
    let callCount = 0;
    manager.setListener((msg: Message) => {
      expect(msg.message.count).toEqual(callCount);
      callCount++;
    });
    subscriptions.push({ topic: "/webviz/bar" });
    manager.updateInternalSubscriptions(subscriptions);
    manager.consume(makeNodeMessage("/webviz/foo", "webviz/Foo", dummyReceiveTime, {}));
    manager.consume(makeNodeMessage("/webviz/foo", "webviz/Foo", dummyReceiveTime, {}));
    expect(callCount).toEqual(2);
  });

  it("can chain node inputs to eachother", () => {
    const manager = new NodeManager([BarNode, BazNode]);
    let barNode = 0;
    let bazCount = 0;
    manager.setListener((msg: Message) => {
      if (msg.topic === "/webviz/bar") {
        expect(msg.message.count).toEqual(barNode);
        barNode++;
      } else if (msg.topic === "/webviz/baz") {
        expect(msg.message.count).toEqual(bazCount);
        bazCount++;
      }
    });
    const subscriptions = [{ topic: "/webviz/bar" }, { topic: "/webviz/baz" }];
    manager.updateInternalSubscriptions(subscriptions);

    manager.consume(makeNodeMessage("/webviz/foo", "webviz/Foo", dummyReceiveTime, {}));
    manager.consume(makeNodeMessage("/webviz/foo", "webviz/Foo", dummyReceiveTime, {}));
    expect(barNode).toEqual(2);
    expect(bazCount).toEqual(4);
  });

  it("does not allow nodes to output non webviz topics", () => {
    const BadNode: NodeDefinition<void> = {
      ...EmptyNode,
      name: "BadNode",
      outputs: [{ name: "/foo", datatype: "foo/Bar" }],
    };
    expect(() => new NodeManager([BadNode])).toThrow();
  });

  describe("updateInternalSubscriptions", () => {
    it("Should return a list of subscribed outputs", () => {
      const manager = new NodeManager([BarNode, BazNode]);
      manager.updateInternalSubscriptions([{ topic: "/webviz/baz" }, { topic: "/webviz/bar" }]);
      expect(manager.getSubscribedOutputs()).toEqual([
        { name: "/webviz/bar", datatype: "webviz/Bar" },
        { name: "/webviz/baz", datatype: "webviz/Baz" },
      ]);
    });
  });

  describe("topic chain", () => {
    const FooNode: NodeDefinition<void> = {
      ...EmptyNode,
      name: "FooNode",
      inputs: ["/webviz/qux"],
      outputs: [{ name: "/webviz/foo", datatype: "webviz/Foo" }],
    };

    const ClockNode: NodeDefinition<void> = {
      ...EmptyNode,
      name: "ClockNode",
      inputs: ["/clock"],
      outputs: [{ name: "/webviz/clock", datatype: "webviz/Clock" }],
    };
    const BarNode: NodeDefinition<void> = {
      ...EmptyNode,
      name: "BarNode",
      inputs: ["/webviz/foo", "/webviz/clock"],
      outputs: [{ name: "/webviz/bar", datatype: "webviz/Bar" }],
    };

    const MixedNode: NodeDefinition<void> = {
      ...EmptyNode,
      name: "MixedNode",
      inputs: ["/webviz/bar", "/some_external_input"],
      outputs: [{ name: "/webviz/mixed", datatype: "webviz/Mixed" }],
    };

    const LeafNode: NodeDefinition<void> = {
      ...EmptyNode,
      name: "LeafNode",
      inputs: ["/webviz/mixed", "/some_other_external_input"],
      outputs: [{ name: "/webviz/leaf", datatype: "webviz/Leaf" }],
    };

    const getFullNodeManager = () => {
      const manager = new NodeManager([FooNode, BarNode, ClockNode, MixedNode, LeafNode]);
      const subscriptions = [];
      ["/webviz/foo", "/webviz/bar", "/webviz/clock", "/webviz/mixed", "/webviz/leaf"].forEach((topic) => {
        subscriptions.push({ topic });
      });
      manager.updateInternalSubscriptions(subscriptions);
      return manager;
    };

    it("returns no ros topics with a webviz only chain", () => {
      const manager = getFullNodeManager();
      expect(manager.getExternalSubscriptionsFor("/webviz/foo")).toHaveLength(0);
      expect(manager.getExternalSubscriptionsFor("/webviz/asdf")).toHaveLength(0);
    });

    it("returns ros topic for ros dependent node", () => {
      const manager = getFullNodeManager();
      expect(manager.getExternalSubscriptionsFor("/webviz/clock")).toEqual([
        { topic: "/clock", requester: { type: "node", name: "ClockNode" } },
      ]);
    });

    it("returns all ros topics in tree for node", () => {
      const manager = getFullNodeManager();
      expect(manager.getExternalSubscriptionsFor("/webviz/bar")).toEqual([
        { topic: "/clock", requester: { type: "node", name: "ClockNode" } },
      ]);
      expect(manager.getExternalSubscriptionsFor("/webviz/mixed")).toContainOnly([
        { topic: "/clock", requester: { type: "node", name: "ClockNode" } },
        { topic: "/some_external_input", requester: { type: "node", name: "MixedNode" } },
      ]);
    });

    it("returns all ros topics for leaf node", () => {
      const manager = getFullNodeManager();
      const topics = manager.getExternalSubscriptionsFor("/webviz/leaf");
      expect(topics).toHaveLength(3);
    });
  });

  describe("node dependencies", () => {
    const SelfNode: NodeDefinition<void> = {
      ...EmptyNode,
      name: "SelfNode",
      inputs: ["/webviz/self"],
      outputs: [{ name: "/webviz/self", datatype: "webviz/Self" }],
    };

    const FirstNode: NodeDefinition<void> = {
      ...EmptyNode,
      name: "FirstNode",
      inputs: ["/webviz/third"],
      outputs: [{ name: "/webviz/first", datatype: "webviz/Foo" }],
    };

    const SecondNode: NodeDefinition<void> = {
      ...EmptyNode,
      name: "SecondNode",
      inputs: ["/webviz/first"],
      outputs: [{ name: "/webviz/second", datatype: "webviz/Foo" }],
    };

    const ThirdNode: NodeDefinition<void> = {
      ...EmptyNode,
      name: "ThirdNode",
      inputs: ["/webviz/second"],
      outputs: [{ name: "/webviz/third", datatype: "webviz/Foo" }],
    };

    const FourthNode: NodeDefinition<void> = {
      ...EmptyNode,
      name: "FourthNode",
      inputs: ["/webviz/third", "/webviz/second"],
      outputs: [{ name: "/webviz/fourth", datatype: "webviz/Foo" }],
    };

    const FifthNode: NodeDefinition<void> = {
      ...EmptyNode,
      name: "FifthNode",
      inputs: ["/webviz/third", "/webviz/fourth", "/webviz/second"],
      outputs: [{ name: "/webviz/fifth", datatype: "webviz/Foo" }],
    };

    it("throws on circular dependencies of inputs and outputs in single node", () => {
      expect(() => new NodeManager([SelfNode])).toThrow("SelfNode");
    });

    it("throws on circular dependencies of inputs and outputs in multiple nodes", () => {
      expect(() => new NodeManager([ThirdNode, SecondNode, FirstNode])).toThrow("ThirdNode");
    });

    it("does not throw on two nodes dependent on a single parent", () => {
      expect(() => new NodeManager([SecondNode, ThirdNode, FourthNode, FifthNode])).not.toThrow();
    });

    describe("updateInternalSubscriptions", () => {
      it("Should not add duplicate references to nodes", () => {
        const manager = new NodeManager([SecondNode, ThirdNode, FourthNode, FifthNode]);
        manager.updateInternalSubscriptions([{ topic: "/webviz/fifth" }, { topic: "/webviz/fourth" }]);
        expect(manager.getSubscribedOutputs()).toEqual([
          { name: "/webviz/fourth", datatype: "webviz/Foo" },
          { name: "/webviz/third", datatype: "webviz/Foo" },
          { name: "/webviz/second", datatype: "webviz/Foo" },
          { name: "/webviz/fifth", datatype: "webviz/Foo" },
        ]);
        expect(manager.getSubscribedNodes().length).toEqual(4);
      });
    });
  });
});
