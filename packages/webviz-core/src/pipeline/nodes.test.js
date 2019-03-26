// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { validateNodeDefinitions, makeNodeMessage, applyNodesToMessages, type NodeDefinition } from "./nodes";

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

describe("nodes", () => {
  describe("validateNodeDefinitions", () => {
    it("does not throw for a valid definition", () => {
      const GoodNode: NodeDefinition<void> = {
        ...EmptyNode,
        name: "GoodNode",
        outputs: [{ name: "/webviz/foo", datatype: "foo/Bar" }],
      };
      expect(() => validateNodeDefinitions([GoodNode])).not.toThrow();
    });

    it("does not allow nodes to output non webviz topics", () => {
      const BadNode: NodeDefinition<void> = {
        ...EmptyNode,
        name: "BadNode",
        outputs: [{ name: "/foo", datatype: "foo/Bar" }],
      };
      expect(() => validateNodeDefinitions([BadNode])).toThrow();
    });

    it("does not allow self-referring nodes", () => {
      const SelfReferringNode: NodeDefinition<void> = {
        ...EmptyNode,
        name: "SelfReferringNode",
        inputs: ["/webviz/foo"],
        outputs: [{ name: "/webviz/foo", datatype: "foo/Bar" }],
      };
      expect(() => validateNodeDefinitions([SelfReferringNode])).toThrow();
    });

    it("does not allow circular dependencies", () => {
      const NodeA: NodeDefinition<void> = {
        ...EmptyNode,
        name: "NodeA",
        inputs: ["/webviz/b"],
        outputs: [{ name: "/webviz/a", datatype: "a" }],
      };
      const NodeB: NodeDefinition<void> = {
        ...EmptyNode,
        name: "NodeB",
        inputs: ["/webviz/a"],
        outputs: [{ name: "/webviz/b", datatype: "b" }],
      };
      expect(() => validateNodeDefinitions([NodeA, NodeB])).toThrow();
      // For sanity, the individual nodes should be fine:
      expect(() => validateNodeDefinitions([NodeA])).not.toThrow();
      expect(() => validateNodeDefinitions([NodeB])).not.toThrow();
    });

    it("does not allow nodes to output to the same topic", () => {
      const NodeA: NodeDefinition<void> = {
        ...EmptyNode,
        name: "NodeA",
        inputs: ["/external/1"],
        outputs: [{ name: "/webviz/internal", datatype: "internal" }],
      };
      const NodeB: NodeDefinition<void> = {
        ...EmptyNode,
        name: "NodeB",
        inputs: ["/external/2"],
        outputs: [{ name: "/webviz/internal", datatype: "internal" }],
      };
      expect(() => validateNodeDefinitions([NodeA, NodeB])).toThrow();
      // For sanity, the individual nodes should be fine:
      expect(() => validateNodeDefinitions([NodeA])).not.toThrow();
      expect(() => validateNodeDefinitions([NodeB])).not.toThrow();
    });
  });

  describe("applyNodesToMessages", () => {
    it("runs all nodes on a set of messages, even recursively", () => {
      const NodeA: NodeDefinition<number> = {
        name: "NodeA",
        inputs: ["/external"],
        outputs: [
          { name: "/webviz/a/counter", datatype: "a/counter" },
          { name: "/webviz/a/other_message", datatype: "a/other_message" },
        ],
        datatypes: {},
        defaultState: 0,
        callback({ message, state }) {
          return {
            messages: [
              makeNodeMessage("/webviz/a/counter", "a/counter", {
                count: state,
                data: message.message.data,
              }),
              makeNodeMessage("/webviz/a/other_message", "a/other_message", { something: "else" }),
            ],
            state: state + 1,
          };
        },
      };
      const NodeB: NodeDefinition<void> = {
        ...EmptyNode,
        name: "NodeB",
        inputs: ["/webviz/a/counter"],
        outputs: [{ name: "/webviz/b", datatype: "b" }],
        callback({ message }) {
          return {
            messages: [makeNodeMessage("/webviz/b", "b", { count: message.message.count })],
            state: undefined,
          };
        },
      };

      const messages = [
        {
          topic: "/external",
          datatype: "anything",
          op: "message",
          receiveTime: { sec: 1, nsec: 0 },
          message: { data: "first message" },
        },
        {
          topic: "/external",
          datatype: "anything",
          op: "message",
          receiveTime: { sec: 2, nsec: 0 },
          message: { data: "second message" },
        },
      ];

      const output = applyNodesToMessages([NodeA, NodeB], messages);

      // Note that the output remains sorted by `receiveTime`.
      expect(output).toEqual({
        messages: [
          {
            datatype: "anything",
            message: { data: "first message" },
            op: "message",
            receiveTime: { sec: 1, nsec: 0 },
            topic: "/external",
          },
          {
            datatype: "a/counter",
            message: { count: 0, data: "first message" },
            op: "message",
            receiveTime: { sec: 1, nsec: 0 },
            topic: "/webviz/a/counter",
          },
          { datatype: "b", message: { count: 0 }, op: "message", receiveTime: { sec: 1, nsec: 0 }, topic: "/webviz/b" },
          {
            datatype: "a/other_message",
            message: { something: "else" },
            op: "message",
            receiveTime: { sec: 1, nsec: 0 },
            topic: "/webviz/a/other_message",
          },
          {
            datatype: "anything",
            message: { data: "second message" },
            op: "message",
            receiveTime: { sec: 2, nsec: 0 },
            topic: "/external",
          },
          {
            datatype: "a/counter",
            message: { count: 1, data: "second message" },
            op: "message",
            receiveTime: { sec: 2, nsec: 0 },
            topic: "/webviz/a/counter",
          },
          { datatype: "b", message: { count: 1 }, op: "message", receiveTime: { sec: 2, nsec: 0 }, topic: "/webviz/b" },
          {
            datatype: "a/other_message",
            message: { something: "else" },
            op: "message",
            receiveTime: { sec: 2, nsec: 0 },
            topic: "/webviz/a/other_message",
          },
        ],
        states: [2, undefined],
      });
    });
  });
});
