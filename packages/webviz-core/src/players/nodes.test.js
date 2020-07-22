// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { validateNodeDefinitions, makeNodeMessage, applyNodesToMessages, type NodeDefinition } from "./nodes";
import sendNotification from "webviz-core/src/util/sendNotification";

const EmptyNode: $Shape<NodeDefinition<void>> = {
  inputs: [],
  output: { name: "", datatype: "" },
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
        output: { name: "/webviz/foo", datatype: "foo/Bar" },
      };
      expect(() => validateNodeDefinitions([GoodNode])).not.toThrow();
    });

    it("does not allow nodes to output non webviz topics", () => {
      const BadNode: NodeDefinition<void> = {
        ...EmptyNode,
        output: { name: "/foo", datatype: "foo/Bar" },
      };
      expect(() => validateNodeDefinitions([BadNode])).toThrow();
    });

    it("does not allow self-referring nodes", () => {
      const SelfReferringNode: NodeDefinition<void> = {
        ...EmptyNode,
        inputs: ["/webviz/foo"],
        output: { name: "/webviz/foo", datatype: "foo/Bar" },
      };
      expect(() => validateNodeDefinitions([SelfReferringNode])).toThrow();
    });

    it("does not allow circular dependencies", () => {
      const NodeA: NodeDefinition<void> = {
        ...EmptyNode,
        inputs: ["/webviz/b"],
        output: { name: "/webviz/a", datatype: "a" },
      };
      const NodeB: NodeDefinition<void> = {
        ...EmptyNode,
        inputs: ["/webviz/a"],
        output: { name: "/webviz/b", datatype: "b" },
      };
      expect(() => validateNodeDefinitions([NodeA, NodeB])).toThrow();
      // For sanity, the individual nodes should be fine:
      expect(() => validateNodeDefinitions([NodeA])).not.toThrow();
      expect(() => validateNodeDefinitions([NodeB])).not.toThrow();
    });

    it("does not allow nodes to output to the same topic", () => {
      const NodeA: NodeDefinition<void> = {
        ...EmptyNode,
        inputs: ["/external/1"],
        output: { name: "/webviz/internal", datatype: "internal" },
      };
      const NodeB: NodeDefinition<void> = {
        ...EmptyNode,
        inputs: ["/external/2"],
        output: { name: "/webviz/internal", datatype: "internal" },
      };
      expect(() => validateNodeDefinitions([NodeA, NodeB])).toThrow();
      // For sanity, the individual nodes should be fine:
      expect(() => validateNodeDefinitions([NodeA])).not.toThrow();
      expect(() => validateNodeDefinitions([NodeB])).not.toThrow();
    });

    it("breaks when nodes refer to datatypes that they do not define", () => {
      const NodeA: NodeDefinition<void> = {
        ...EmptyNode,
        inputs: ["/webviz/b"],
        output: { name: "/webviz/a", datatype: "a" },
        datatypes: {
          "std_msgs/A": {
            fields: [
              {
                isArray: true,
                isComplex: true,
                arrayLength: undefined,
                name: "b",
                type: "std_msgs/B",
              },
            ],
          },
        },
      };
      expect(() => validateNodeDefinitions([NodeA])).toThrow(new RegExp(/std_msgs\/B/));
    });

    it("validates correctly typed datatypes", () => {
      const NodeA: NodeDefinition<void> = {
        ...EmptyNode,
        inputs: ["/webviz/b"],
        output: { name: "/webviz/a", datatype: "a" },
        datatypes: {
          "std_msgs/B": {
            fields: [
              {
                isArray: false,
                isComplex: false,
                arrayLength: undefined,
                name: "c",
                type: "string",
              },
            ],
          },

          "std_msgs/A": {
            fields: [
              {
                isArray: true,
                isComplex: true,
                arrayLength: undefined,
                name: "b",
                type: "std_msgs/B",
              },
            ],
          },
        },
      };
      expect(() => validateNodeDefinitions([NodeA])).not.toThrow();
    });
  });

  describe("applyNodesToMessages", () => {
    const messages = [
      {
        topic: "/external",
        receiveTime: { sec: 1, nsec: 0 },
        message: { data: "first message" },
      },
      {
        topic: "/external",
        receiveTime: { sec: 2, nsec: 0 },
        message: { data: "second message" },
      },
    ];

    it("runs all nodes on a set of messages, even recursively", () => {
      const NodeA: NodeDefinition<number> = {
        inputs: ["/external"],
        output: { name: "/webviz/a/counter", datatype: "a/counter" },
        datatypes: {},
        defaultState: 0,
        callback({ message, state }) {
          return {
            messages: [
              makeNodeMessage("/webviz/a/counter", {
                count: state,
                data: message.message.data,
              }),
            ],
            state: state + 1,
          };
        },
      };
      const NodeB: NodeDefinition<void> = {
        ...EmptyNode,
        inputs: ["/webviz/a/counter"],
        output: { name: "/webviz/b", datatype: "b" },
        callback({ message }) {
          return {
            messages: [makeNodeMessage("/webviz/b", { count: message.message.count })],
            state: undefined,
          };
        },
      };

      const output = applyNodesToMessages([NodeA, NodeB], messages);

      // Note that the output remains sorted by `receiveTime`.
      expect(output).toEqual({
        messages: [
          {
            message: { data: "first message" },
            receiveTime: { sec: 1, nsec: 0 },
            topic: "/external",
          },
          {
            message: { count: 0, data: "first message" },
            receiveTime: { sec: 1, nsec: 0 },
            topic: "/webviz/a/counter",
          },
          { message: { count: 0 }, receiveTime: { sec: 1, nsec: 0 }, topic: "/webviz/b" },
          {
            message: { data: "second message" },
            receiveTime: { sec: 2, nsec: 0 },
            topic: "/external",
          },
          {
            message: { count: 1, data: "second message" },
            receiveTime: { sec: 2, nsec: 0 },
            topic: "/webviz/a/counter",
          },
          { message: { count: 1 }, receiveTime: { sec: 2, nsec: 0 }, topic: "/webviz/b" },
        ],
        states: [2, undefined],
      });
    });

    it("continues processing if a node throws an error", () => {
      const NodeA: NodeDefinition<number> = {
        inputs: ["/external"],
        output: { name: "/webviz/a/counter", datatype: "a/counter" },
        datatypes: {},
        defaultState: 0,
        callback() {
          throw new Error("Node failed to run!");
        },
      };
      expect(() => applyNodesToMessages([NodeA], messages)).not.toThrow();
      sendNotification.expectCalledDuringTest();
    });
  });
});
