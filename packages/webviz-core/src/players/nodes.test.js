// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import {
  validateNodeDefinitions,
  makeNodeMessage,
  applyNodesToMessages,
  getDefaultNodeStates,
  getNodeSubscriptions,
  type NodeDefinition,
} from "./nodes";
import { deepParse, wrapJsObject } from "webviz-core/src/util/binaryObjects";
import { basicDatatypes } from "webviz-core/src/util/datatypes";
import sendNotification from "webviz-core/src/util/sendNotification";

const EmptyNode: $Shape<NodeDefinition<void>> = {
  inputs: [],
  output: { name: "", datatype: "foo/Bar" },
  datatypes: { "foo/Bar": { fields: [] } },
  format: "parsedMessages",
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
        datatypes: { a: { fields: [] } },
      };
      const NodeB: NodeDefinition<void> = {
        ...EmptyNode,
        inputs: ["/webviz/a"],
        output: { name: "/webviz/b", datatype: "b" },
        datatypes: { b: { fields: [] } },
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
        datatypes: { internal: { fields: [] } },
      };
      const NodeB: NodeDefinition<void> = {
        ...EmptyNode,
        inputs: ["/external/2"],
        output: { name: "/webviz/internal", datatype: "internal" },
        datatypes: { internal: { fields: [] } },
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
        output: { name: "/webviz/a", datatype: "std_msgs/A" },
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
        format: "parsedMessages",
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

      const output = applyNodesToMessages({
        nodeDefinitions: [NodeA, NodeB],
        originalMessages: messages,
        originalBobjects: [],
        states: getDefaultNodeStates([NodeA, NodeB]),
        datatypes: {},
      });

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
        states: {
          "/webviz/a/counter": 2,
          "/webviz/b": undefined,
        },
      });
    });

    it("continues processing if a node throws an error", () => {
      const NodeA: NodeDefinition<number> = {
        inputs: ["/external"],
        output: { name: "/webviz/a/counter", datatype: "a/counter" },
        datatypes: {},
        format: "parsedMessages",
        defaultState: 0,
        callback() {
          throw new Error("Node failed to run!");
        },
      };
      expect(() =>
        applyNodesToMessages({
          nodeDefinitions: [NodeA],
          originalMessages: messages,
          originalBobjects: [],
          states: {},
          datatypes: {},
        })
      ).not.toThrow();
      sendNotification.expectCalledDuringTest();
    });

    it("returns properly wrapped bobjects irrespective of how the node returns them", () => {
      const originalBobjects = [
        {
          receiveTime: { sec: 0, nsec: 0 },
          topic: "/external",
          message: wrapJsObject(basicDatatypes, "time", { sec: 0, nsec: 0 }),
        },
      ];
      const rawReturnedBobject1 = { seq: 1, frame_id: "2", stamp: { sec: 3, nsec: 4 } };
      const rawReturnedBobject2 = { seq: 5, frame_id: "5", stamp: { sec: 7, nsec: 8 } };

      const node: NodeDefinition<void> = {
        ...EmptyNode,
        inputs: ["/external"],
        output: { name: "/webviz/foo", datatype: "std_msgs/Header" },
        datatypes: basicDatatypes,
        format: "bobjects",
        callback() {
          return {
            state: undefined,
            messages: [
              // Returns a plain JS object
              makeNodeMessage("/webviz/foo", rawReturnedBobject1),
              // Returns a bobject
              makeNodeMessage("/webviz/foo", wrapJsObject(basicDatatypes, "std_msgs/Header", rawReturnedBobject2)),
            ],
          };
        },
      };
      const output = applyNodesToMessages({
        nodeDefinitions: [node],
        originalMessages: [],
        originalBobjects,
        states: getDefaultNodeStates([node]),
        datatypes: basicDatatypes,
      });

      expect(
        output.messages.filter(({ topic }) => topic === "/webviz/foo").map(({ message }) => deepParse(message))
      ).toEqual([rawReturnedBobject1, rawReturnedBobject2]);
    });
  });

  describe("getNodeSubscriptions", () => {
    it("generates parsed subscriptions for parsedMessages nodes", () => {
      const subscriptions = getNodeSubscriptions([
        {
          ...EmptyNode,
          inputs: ["/in_topic"],
          format: "parsedMessages",
          output: { name: "/out_topic", datatype: "" },
        },
      ]);
      expect(subscriptions).toEqual([
        {
          topic: "/in_topic",
          format: "parsedMessages",
          requester: { type: "node", name: "/out_topic" },
        },
      ]);
    });

    it("generates bobject subscriptions for bobject nodes", () => {
      const subscriptions = getNodeSubscriptions([
        {
          ...EmptyNode,
          inputs: ["/in_topic"],
          format: "bobjects",
          output: { name: "/out_topic", datatype: "" },
        },
      ]);
      expect(subscriptions).toEqual([
        {
          topic: "/in_topic",
          format: "bobjects",
          requester: { type: "node", name: "/out_topic" },
        },
      ]);
    });
  });
});
