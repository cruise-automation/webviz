// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { mount } from "enzyme";
import * as React from "react";

import type { UseTreeInput } from "./types";
import useTopicTree from "./useTopicTree";
import type { Topic } from "webviz-core/src/players/types";

const TREE_CONFIG = {
  name: "root",
  children: [
    {
      name: "Group1",
      children: [{ topicName: "/foo" }],
    },
    {
      name: "Group2",
      children: [{ name: "Nested Group", children: [{ topicName: "/bar" }] }],
    },
  ],
};

function makeTopics(topicNames: string[]): Topic[] {
  return topicNames.map((name) => ({ name, datatype: "visualization_msgs/MarkerArray" }));
}

describe("useTopicTree", () => {
  // Create a helper component that exposes the results of the hook for mocking.
  function createTest() {
    function Test(props: UseTreeInput) {
      Test.result(useTopicTree(props));
      return null;
    }
    Test.result = jest.fn();
    return Test;
  }

  describe("rootTreeNode", () => {
    it("simple tree", () => {
      const Test = createTest();
      mount(
        <Test
          checkedKeys={[]}
          modifiedNamespaceTopics={[]}
          providerTopics={[]}
          topicSettings={{}}
          topicTreeConfig={{ name: "root", children: [{ topicName: "/foo" }] }}
        />
      );

      expect(Test.result.mock.calls[0][0].rootTreeNode).toEqual({
        children: [{ key: "t:/foo", topicName: "/foo", type: "topic" }],
        key: "name:root",
        name: "root",
        type: "group",
      });
    });

    it("creates Uncategorized name node and adds uncategorized topics underneath", () => {
      const Test = createTest();
      const root = mount(
        <Test
          checkedKeys={[]}
          modifiedNamespaceTopics={[]}
          providerTopics={makeTopics(["/bar", "/webviz_bar_2/foo"])}
          topicSettings={{}}
          topicTreeConfig={{ name: "root", children: [{ topicName: "/foo" }] }}
        />
      );

      // $FlowFixMe TreeTopicNode don't have children
      expect(Test.result.mock.calls[0][0].rootTreeNode.children).toEqual([
        { key: "t:/foo", topicName: "/foo", type: "topic" },
        {
          children: [
            {
              key: "t:/bar",
              parentKey: "name:(Uncategorized)",
              topicName: "/bar",
              datatype: "visualization_msgs/MarkerArray",
              type: "topic",
            },
            {
              key: "t:/webviz_bar_2/foo",
              parentKey: "name:(Uncategorized)",
              topicName: "/webviz_bar_2/foo",
              datatype: "visualization_msgs/MarkerArray",
              type: "topic",
            },
          ],
          key: "name:(Uncategorized)",
          name: "(Uncategorized)",
          type: "group",
        },
      ]);

      // Uncategorized node will get updated when the provider topics change.
      root.setProps({ providerTopics: makeTopics(["/bar1"]) });
      // $FlowFixMe TreeTopicNode don't have children
      expect(Test.result.mock.calls[1][0].rootTreeNode.children).toEqual([
        { key: "t:/foo", topicName: "/foo", type: "topic" },
        {
          children: [
            {
              key: "t:/bar1",
              parentKey: "name:(Uncategorized)",
              topicName: "/bar1",
              datatype: "visualization_msgs/MarkerArray",
              type: "topic",
            },
          ],
          key: "name:(Uncategorized)",
          name: "(Uncategorized)",
          type: "group",
        },
      ]);
    });
  });

  describe("checked state", () => {
    it("returns selectedTopicNames based on checkedNodes", async () => {
      const Test = createTest();
      const root = mount(
        <Test
          checkedKeys={["/foo"]}
          modifiedNamespaceTopics={[]}
          providerTopics={makeTopics(["/bar", "/webviz_bag_2/foo"])}
          topicSettings={{}}
          topicTreeConfig={TREE_CONFIG}
        />
      );

      expect(Test.result.mock.calls[0][0].selectedTopicNames).toEqual([]);
      root.setProps({ checkedKeys: ["name:Group1", "t:/foo", "t:/bar"] });
      expect(Test.result.mock.calls[1][0].selectedTopicNames).toEqual(["/foo"]);
      root.setProps({
        checkedKeys: ["name:Group1", "t:/foo", "t:/bar", "t:/webviz_bag_2/foo", "name:(Uncategorized)"],
      });
      expect(Test.result.mock.calls[2][0].selectedTopicNames).toEqual(["/foo", "/webviz_bag_2/foo"]);
    });

    it("returns selectedNamespacesByTopic based on checkedNodes", async () => {
      const Test = createTest();
      const checkedKeys = ["name:Group1", "t:/foo", "t:/bar"];
      const root = mount(
        <Test
          checkedKeys={checkedKeys}
          modifiedNamespaceTopics={[]}
          providerTopics={makeTopics(["/bar", "/webviz_bag_2/foo"])}
          topicSettings={{}}
          topicTreeConfig={TREE_CONFIG}
        />
      );
      expect(Test.result.mock.calls[0][0].selectedNamespacesByTopic).toEqual({});
      root.setProps({ checkedKeys: [...checkedKeys, "ns:/foo:ns1", "ns:/foo:ns2"] });
      expect(Test.result.mock.calls[1][0].selectedNamespacesByTopic).toEqual({ "/foo": ["ns1", "ns2"] });
    });
  });
  describe("topic settings", () => {
    it("returns settingsChangedKeysSet", () => {
      const Test = createTest();
      const root = mount(
        <Test
          checkedKeys={["/foo"]}
          modifiedNamespaceTopics={[]}
          providerTopics={makeTopics(["/bar", "/webviz_bag_2/foo"])}
          topicSettings={{}}
          topicTreeConfig={TREE_CONFIG}
        />
      );

      expect(Array.from(Test.result.mock.calls[0][0].settingsChangedKeysSet)).toEqual([]);
      root.setProps({
        topicSettings: {
          "/bar": { pointSize: 1 },
          "/foo": { someSetting: 1 },
          "/bar1": { someSetting1: "some value" },
        },
      });
      expect(Array.from(Test.result.mock.calls[1][0].settingsChangedKeysSet)).toEqual(["t:/bar", "t:/foo"]);

      // Recompute settingsChanged on topic nodes.
      root.setProps({ providerTopics: makeTopics(["/bar", "/webviz_bag_2/foo", "/bar1"]) });
      expect(Array.from(Test.result.mock.calls[2][0].settingsChangedKeysSet)).toEqual(["t:/bar", "t:/foo", "t:/bar1"]);
    });
  });
});
