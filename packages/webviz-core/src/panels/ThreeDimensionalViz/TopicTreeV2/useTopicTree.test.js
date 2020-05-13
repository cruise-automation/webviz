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
import useTopicTree, { generateNodeKey } from "./useTopicTree";
import { TOPIC_DISPLAY_MODES } from "webviz-core/src/panels/ThreeDimensionalViz/TopicTreeV2/TopicViewModeSelector";
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
const sharedProps = {
  availableNamespacesByTopic: {},
  checkedKeys: [],
  defaultTopicSettings: {},
  expandedKeys: [],
  filterText: "",
  modifiedNamespaceTopics: [],
  providerTopics: [],
  saveConfig: () => {},
  sceneErrorsByTopicKey: {},
  topicDisplayMode: TOPIC_DISPLAY_MODES.SHOW_ALL.value,
  topicSettings: {},
  topicTreeConfig: TREE_CONFIG,
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

  describe("generateNodeKey", () => {
    it("throws an error when no topicName or name are provided", () => {
      expect(() => generateNodeKey({})).toThrow();
    });

    it("prioritizes topicName over name", () => {
      expect(generateNodeKey({ topicName: "/foo", name: "Foo" })).toEqual("t:/foo");
    });

    it("creates a namespace node", () => {
      expect(generateNodeKey({ topicName: "/foo", namespace: "a" })).toEqual("ns:/foo:a");
    });

    it("creates a name node", () => {
      expect(generateNodeKey({ name: "Foo" })).toEqual("name:Foo");
    });

    it("generates key for bag2 group", () => {
      expect(generateNodeKey({ name: "Foo", isFeatureColumn: true })).toEqual("name_2:Foo");
    });
    it("generates key for bag2 topic", () => {
      expect(generateNodeKey({ topicName: "/foo", name: "Foo", isFeatureColumn: true })).toEqual(
        "t:/webviz_source_2/foo"
      );
    });
    it("generates key for bag2 namespace", () => {
      expect(generateNodeKey({ topicName: "/foo", namespace: "ns1", isFeatureColumn: true })).toEqual(
        "ns:/webviz_source_2/foo:ns1"
      );
    });
  });

  describe("rootTreeNode", () => {
    it("simple tree", () => {
      const Test = createTest();
      mount(<Test {...sharedProps} topicTreeConfig={{ name: "root", children: [{ topicName: "/foo" }] }} />);

      expect(Test.result.mock.calls[0][0].rootTreeNode).toEqual({
        available: false,
        children: [
          {
            available: false,
            featureKey: "t:/webviz_source_2/foo",
            key: "t:/foo",
            providerAvailable: false,
            topicName: "/foo",
            type: "topic",
          },
        ],
        featureKey: "name_2:root",
        key: "name:root",
        name: "root",
        providerAvailable: false,
        type: "group",
      });
    });

    it("creates Uncategorized group node and adds uncategorized topics underneath", () => {
      const Test = createTest();
      const root = mount(
        <Test
          {...sharedProps}
          providerTopics={makeTopics(["/bar", "/webviz_source_2/foo"])}
          topicTreeConfig={{ name: "root", children: [{ topicName: "/foo" }] }}
          filterText=""
          availableNamespacesByTopic={{}}
        />
      );

      // $FlowFixMe TreeTopicNode don't have children
      expect(Test.result.mock.calls[0][0].rootTreeNode.children).toEqual([
        {
          available: false,
          featureKey: "t:/webviz_source_2/foo",
          key: "t:/foo",
          providerAvailable: true,
          topicName: "/foo",
          type: "topic",
        },
        {
          available: true,
          children: [
            {
              available: true,
              datatype: "visualization_msgs/MarkerArray",
              featureKey: "t:/webviz_source_2/bar",
              key: "t:/bar",
              parentKey: "name:(Uncategorized)",
              providerAvailable: true,
              topicName: "/bar",
              type: "topic",
            },
            {
              available: true,
              datatype: "visualization_msgs/MarkerArray",
              featureKey: "t:/webviz_source_2/webviz_source_2/foo",
              key: "t:/webviz_source_2/foo",
              parentKey: "name:(Uncategorized)",
              providerAvailable: true,
              topicName: "/webviz_source_2/foo",
              type: "topic",
            },
          ],
          featureKey: "name_2:(Uncategorized)",
          key: "name:(Uncategorized)",
          name: "(Uncategorized)",
          providerAvailable: true,
          type: "group",
        },
      ]);

      // Uncategorized node will get updated when the provider topics change.
      root.setProps({ providerTopics: makeTopics(["/bar1"]) });
      // $FlowFixMe TreeTopicNode don't have children
      expect(Test.result.mock.calls[1][0].rootTreeNode.children).toEqual([
        {
          available: false,
          featureKey: "t:/webviz_source_2/foo",
          key: "t:/foo",
          providerAvailable: true,
          topicName: "/foo",
          type: "topic",
        },
        {
          available: true,
          children: [
            {
              available: true,
              datatype: "visualization_msgs/MarkerArray",
              featureKey: "t:/webviz_source_2/bar1",
              key: "t:/bar1",
              parentKey: "name:(Uncategorized)",
              providerAvailable: true,
              topicName: "/bar1",
              type: "topic",
            },
          ],
          featureKey: "name_2:(Uncategorized)",
          key: "name:(Uncategorized)",
          name: "(Uncategorized)",
          providerAvailable: true,
          type: "group",
        },
      ]);
    });
  });

  describe("checked state", () => {
    it("returns selectedTopicNames based on checkedKeys", async () => {
      const Test = createTest();
      const root = mount(
        <Test {...sharedProps} checkedKeys={["/foo"]} providerTopics={makeTopics(["/bar", "/webviz_source_2/foo"])} />
      );

      expect(Test.result.mock.calls[0][0].selectedTopicNames).toEqual([]);
      root.setProps({ checkedKeys: ["name:Group1", "t:/foo", "t:/bar"] });
      expect(Test.result.mock.calls[1][0].selectedTopicNames).toEqual(["/foo"]);
      root.setProps({
        checkedKeys: ["name:Group1", "t:/foo", "t:/bar", "t:/webviz_source_2/foo", "name:(Uncategorized)"],
      });
      expect(Test.result.mock.calls[2][0].selectedTopicNames).toEqual(["/foo", "/webviz_source_2/foo"]);
    });

    it("returns selectedNamespacesByTopic based on checkedKeys", async () => {
      const Test = createTest();
      const checkedKeys = ["name:Group1", "t:/foo", "t:/bar"];
      const root = mount(
        <Test
          {...sharedProps}
          checkedKeys={checkedKeys}
          providerTopics={makeTopics(["/bar", "/webviz_source_2/foo"])}
        />
      );
      expect(Test.result.mock.calls[0][0].selectedNamespacesByTopic).toEqual({});
      root.setProps({ checkedKeys: [...checkedKeys, "ns:/foo:ns1", "ns:/foo:ns2"] });
      expect(Test.result.mock.calls[1][0].selectedNamespacesByTopic).toEqual({ "/foo": ["ns1", "ns2"] });
    });
  });

  describe("topic settings", () => {
    it("returns derivedCustomSettingsByKey with optional overrideColor field", () => {
      const Test = createTest();
      const root = mount(
        <Test {...sharedProps} topicSettings={{}} providerTopics={makeTopics(["/bar", "/webviz_source_2/foo"])} />
      );

      expect(Test.result.mock.calls[0][0].derivedCustomSettingsByKey).toEqual({});
      root.setProps({
        topicSettings: {
          "/bar": { pointSize: 1 },
          "/foo": { someSetting: 1 },
          "/bar1": { someSetting1: "some value" },
        },
      });
      expect(Test.result.mock.calls[1][0].derivedCustomSettingsByKey).toEqual({
        "t:/bar": { isDefaultSettings: false },
        "t:/bar1": { isDefaultSettings: false },
        "t:/foo": { isDefaultSettings: false },
      });

      // Convert overrideColor to rgb format if present.
      root.setProps({
        topicSettings: {
          "/bar": { pointSize: 1 },
          "/bar1": { someSetting1: "some value", overrideColor: "123,122,121,1" },
        },
      });
      expect(Test.result.mock.calls[2][0].derivedCustomSettingsByKey).toEqual({
        "t:/bar": { isDefaultSettings: false },
        "t:/bar1": { isDefaultSettings: false, overrideColor: "rgb(123, 122, 121)" },
      });
    });

    it("derives isDefaultSettings field from defaultTopicSettings input ", () => {
      const Test = createTest();
      mount(
        <Test
          {...sharedProps}
          defaultTopicSettings={{ "/bar": { pointSize: 1 } }}
          topicSettings={{ "/bar": { pointSize: 1 }, "/foo": { someSetting: 1, overrideColor: "255,1,1,0.9" } }}
        />
      );

      expect(Test.result.mock.calls[0][0].derivedCustomSettingsByKey).toEqual({
        "t:/bar": { isDefaultSettings: true },
        "t:/foo": { isDefaultSettings: false, overrideColor: "rgba(255, 1, 1, 0.9)" },
      });
    });
  });

  describe("getIsTreeNodeVisibleInScene", () => {
    it("returns visibility for a group node", () => {
      const nameNodeKey = "name:Nested Group";

      const Test = createTest();
      const root = mount(<Test {...sharedProps} checkedKeys={[nameNodeKey]} />);

      // Not visible if children are not available.
      const result0 = Test.result.mock.calls[0][0];
      const node = result0.nodesByKey[nameNodeKey];
      expect(result0.getIsTreeNodeVisibleInScene(node)).toEqual(false);

      // Visible if any child is available, the node is checked and all ancestor nodes are checked.
      root.setProps({ checkedKeys: ["name:Group2", nameNodeKey], providerTopics: makeTopics(["/bar"]) });
      const result1 = Test.result.mock.calls[1][0];
      const node1 = result1.nodesByKey[nameNodeKey];
      expect(result1.getIsTreeNodeVisibleInScene(node1)).toEqual(true);
    });

    it("returns visibility for a topic node", () => {
      const topicNodeKey = "t:/foo";

      const Test = createTest();
      const root = mount(<Test {...sharedProps} checkedKeys={[topicNodeKey]} />);

      // Not visible if topic is unavailable.
      const result0 = Test.result.mock.calls[0][0];
      const node = result0.nodesByKey[topicNodeKey];
      expect(result0.getIsTreeNodeVisibleInScene(node)).toEqual(false);

      // Not visible if ancestor nodes are not all checked.
      root.setProps({ providerTopics: makeTopics(["/foo", "/webviz_source_2/foo"]) });
      const result1 = Test.result.mock.calls[1][0];
      const node1 = result1.nodesByKey[topicNodeKey];
      expect(result1.getIsTreeNodeVisibleInScene(node1)).toEqual(false);

      // Visible if topic is available, checked and all ancestor nodes are checked.
      root.setProps({ checkedKeys: ["name:Group1", topicNodeKey] });
      const result2 = Test.result.mock.calls[2][0];
      const node2 = result2.nodesByKey[topicNodeKey];
      expect(result2.getIsTreeNodeVisibleInScene(node2)).toEqual(true);
    });

    it("returns visibility for a namespace node (topic node + namespace key)", () => {
      const topicNodeKey = "t:/foo";
      const namespaceNodeKey = "ns:/foo:ns1";

      const Test = createTest();
      const root = mount(<Test {...sharedProps} checkedKeys={[namespaceNodeKey]} />);

      // Not visible if parent topic node is not visible.
      const result0 = Test.result.mock.calls[0][0];
      const topicNode0 = result0.nodesByKey[topicNodeKey];
      expect(result0.getIsTreeNodeVisibleInScene(topicNode0)).toEqual(false);
      expect(result0.getIsTreeNodeVisibleInScene(topicNode0, namespaceNodeKey)).toEqual(false);

      root.setProps({ providerTopics: makeTopics(["/foo", "/webviz_source_2/foo"]) });
      const result1 = Test.result.mock.calls[1][0];
      const topicNode1 = result1.nodesByKey[topicNodeKey];
      expect(result1.getIsTreeNodeVisibleInScene(topicNode1)).toEqual(false);
      expect(result1.getIsTreeNodeVisibleInScene(topicNode1, namespaceNodeKey)).toEqual(false);

      // Visible if parent topic node is visible, the node itself and all ancestor nodes are checked.
      root.setProps({ checkedKeys: ["name:Group1", "t:/foo", namespaceNodeKey] });
      const result2 = Test.result.mock.calls[2][0];
      const topicNode2 = result1.nodesByKey[topicNodeKey];
      expect(result2.getIsTreeNodeVisibleInScene(topicNode2, namespaceNodeKey)).toEqual(true);
    });

    it("returns namespace nodes as visibile by default (when the nodes are not checked)", () => {
      const topicNodeKey = "t:/foo";
      const namespaceNodeKey = "ns:/foo:ns1";

      const Test = createTest();
      mount(
        <Test {...sharedProps} providerTopics={makeTopics(["/foo"])} checkedKeys={[topicNodeKey, "name:Group1"]} />
      );

      const result = Test.result.mock.calls[0][0];
      const topicNode = result.nodesByKey[topicNodeKey];
      expect(result.getIsTreeNodeVisibleInScene(topicNode, namespaceNodeKey)).toEqual(true);
    });

    it("does not return namespace nodes as visibile by default if namespaces are modified", () => {
      const topicNodeKey = "t:/foo";
      const namespaceNodeKey = "ns:/foo:ns1";

      const Test = createTest();
      mount(
        <Test
          {...sharedProps}
          modifiedNamespaceTopics={["/foo"]}
          providerTopics={makeTopics(["/foo"])}
          checkedKeys={[topicNodeKey, "name:Group1"]}
        />
      );

      const result = Test.result.mock.calls[0][0];
      const topicNode = result.nodesByKey[topicNodeKey];
      expect(result.getIsTreeNodeVisibleInScene(topicNode, namespaceNodeKey)).toEqual(false);
    });
  });

  describe("getIsNamespaceCheckedByDefault", () => {
    it("returns the checked state for namespace nodes by default (the key does not exist in checkedKeys)", () => {
      const topicNodeKey = "t:/foo";
      const Test = createTest();
      const root = mount(
        <Test {...sharedProps} providerTopics={makeTopics(["/foo"])} checkedKeys={[topicNodeKey, "name:Group1"]} />
      );
      expect(Test.result.mock.calls[0][0].getIsNamespaceCheckedByDefault("/foo")).toEqual(true);
      root.setProps({ modifiedNamespaceTopics: ["/foo"] });
      expect(Test.result.mock.calls[1][0].getIsNamespaceCheckedByDefault("/foo")).toEqual(false);
    });
  });

  describe("toggleCheckAllDescendants", () => {
    it("toggles the group/topic node and all descendants", () => {
      const saveConfigMock = jest.fn();
      const Test = createTest();
      const root = mount(
        <Test {...sharedProps} checkedKeys={["name:Nested Group", "t:/bar"]} saveConfig={saveConfigMock} />
      );

      // Group node.
      Test.result.mock.calls[0][0].toggleCheckAllDescendants("name:Nested Group");
      const expected = { checkedKeys: [] };
      expect(saveConfigMock.mock.calls[0][0]).toEqual(expected);

      // Topic node with namespace children.
      root.setProps({
        checkedKeys: [],
        providerTopics: makeTopics(["/bar"]),
        availableNamespacesByTopic: { "/bar": ["ns1", "ns2"] },
      });
      Test.result.mock.calls[1][0].toggleCheckAllDescendants("t:/bar");
      expect(saveConfigMock.mock.calls[1][0]).toEqual({ checkedKeys: ["t:/bar", "ns:/bar:ns1", "ns:/bar:ns2"] });
    });
  });

  describe("toggleCheckAllAncestors", () => {
    it("toggles the group/topic node and all ancestors", () => {
      const saveConfigMock = jest.fn();
      const Test = createTest();
      const root = mount(<Test {...sharedProps} saveConfig={saveConfigMock} checkedKeys={[]} />);

      // Group node.
      Test.result.mock.calls[0][0].toggleCheckAllAncestors("name:Nested Group");
      const expected = { checkedKeys: ["name:Nested Group", "name:Group2"] };
      expect(saveConfigMock.mock.calls[0][0]).toEqual(expected);

      // Topic node.
      root.setProps({ checkedKeys: expected.checkedKeys });
      Test.result.mock.calls[1][0].toggleCheckAllAncestors("t:/bar");
      expect(saveConfigMock.mock.calls[1][0]).toEqual({ checkedKeys: ["name:Nested Group", "name:Group2", "t:/bar"] });

      // Namespace node.
      root.setProps({
        checkedKeys: [],
        providerTopics: makeTopics(["/bar"]),
        availableNamespacesByTopic: { "/bar": ["ns1", "ns2"] },
      });
      Test.result.mock.calls[2][0].toggleCheckAllAncestors("ns:/bar:ns1", "/bar");
      expect(saveConfigMock.mock.calls[2][0]).toEqual({
        checkedKeys: ["ns:/bar:ns1", "t:/bar", "name:Nested Group", "name:Group2"],
      });

      // Namespace node checked by default.
      root.setProps({
        checkedKeys: ["t:/bar", "name:Nested Group", "name:Group2", "t:/foo"],
        providerTopics: makeTopics(["/bar"]),
        availableNamespacesByTopic: { "/bar": ["ns1", "ns2"] },
      });
      Test.result.mock.calls[3][0].toggleCheckAllAncestors("ns:/bar:ns1", "/bar");
      expect(saveConfigMock.mock.calls[3][0]).toEqual({ checkedKeys: ["t:/foo"] });
    });
  });

  describe("toggleNamespaceChecked", () => {
    it("toggles checked state for namespace node and add entry to modifiedNamespaceTopics", () => {
      const saveConfigMock = jest.fn();
      const Test = createTest();

      const root = mount(
        <Test
          {...sharedProps}
          modifiedNamespaceTopics={["/bar"]}
          saveConfig={saveConfigMock}
          checkedKeys={["t:/foo:ns1", "/webviz_source_2/foo:ns2"]}
        />
      );

      Test.result.mock.calls[0][0].toggleNamespaceChecked({ topicName: "/foo", namespaceKey: "t:/foo:ns1" });
      const expected = ["/webviz_source_2/foo:ns2"];
      expect(saveConfigMock.mock.calls[0][0]).toEqual({
        checkedKeys: expected,
        modifiedNamespaceTopics: ["/bar", "/foo"],
      });

      root.setProps({ checkedKeys: expected });
      Test.result.mock.calls[1][0].toggleNamespaceChecked({
        topicName: "t:/some_topic",
        namespaceKey: "t:/some_topic:ns2",
      });
      expect(saveConfigMock.mock.calls[1][0]).toEqual({
        checkedKeys: ["/webviz_source_2/foo:ns2", "t:/some_topic:ns2"],
        modifiedNamespaceTopics: ["/bar", "t:/some_topic"],
      });
    });

    it("toggles namespaces that are checked by default (no entry in checkedKeys)", () => {
      const saveConfigMock = jest.fn();
      const Test = createTest();

      mount(
        <Test
          {...sharedProps}
          availableNamespacesByTopic={{ "/foo": ["ns1", "ns2", "ns3"] }}
          modifiedNamespaceTopics={["/bar"]}
          saveConfig={saveConfigMock}
          checkedKeys={["name:Group1", "t:/foo"]}
        />
      );

      Test.result.mock.calls[0][0].toggleNamespaceChecked({ topicName: "/foo", namespaceKey: "ns:/foo:ns1" });
      expect(saveConfigMock.mock.calls[0][0]).toEqual({
        checkedKeys: ["name:Group1", "t:/foo", "ns:/foo:ns2", "ns:/foo:ns3"],
        modifiedNamespaceTopics: ["/bar", "/foo"],
      });
    });

    it("ensures uniqueness in checkedKeys and modifiedNamespaceTopics", () => {
      const saveConfigMock = jest.fn();
      const Test = createTest();
      mount(
        <Test
          {...sharedProps}
          modifiedNamespaceTopics={["/bar", "/bar", "/foo"]}
          saveConfig={saveConfigMock}
          checkedKeys={["t:/foo:ns1", "t:/foo:ns1", "/webviz_source_2/foo:ns2"]}
        />
      );
      Test.result.mock.calls[0][0].toggleNamespaceChecked({ topicName: "/foo", namespaceKey: "t:/foo:ns1" });
      expect(saveConfigMock.mock.calls[0][0]).toEqual({
        checkedKeys: ["/webviz_source_2/foo:ns2"],
        modifiedNamespaceTopics: ["/bar", "/foo"],
      });
    });
  });

  describe("toggleNodeChecked", () => {
    it("toggles checked state for group nodes", () => {
      const saveConfigMock = jest.fn();
      const Test = createTest();

      const root = mount(
        <Test {...sharedProps} saveConfig={saveConfigMock} checkedKeys={["name:Group1", "name:Nested Group"]} />
      );

      Test.result.mock.calls[0][0].toggleNodeChecked("name:Group1");
      const expected = ["name:Nested Group"];
      expect(saveConfigMock.mock.calls[0][0]).toEqual({ checkedKeys: expected });

      root.setProps({ checkedKeys: expected });
      Test.result.mock.calls[1][0].toggleNodeChecked("name:Group2");
      expect(saveConfigMock.mock.calls[1][0]).toEqual({ checkedKeys: [...expected, "name:Group2"] });
    });

    it("toggles checked state for topic nodes", () => {
      const saveConfigMock = jest.fn();
      const Test = createTest();

      const root = mount(
        <Test {...sharedProps} saveConfig={saveConfigMock} checkedKeys={["t:/foo", "t:/some_topic"]} />
      );

      Test.result.mock.calls[0][0].toggleNodeChecked("t:/foo");
      const expected = ["t:/some_topic"];
      expect(saveConfigMock.mock.calls[0][0]).toEqual({ checkedKeys: expected });

      root.setProps({ checkedKeys: expected });
      Test.result.mock.calls[1][0].toggleNodeChecked("t:/some_topic");
      expect(saveConfigMock.mock.calls[1][0]).toEqual({ checkedKeys: [] });
    });
  });

  describe("toggleNodeExpanded", () => {
    it("toggles expanded state for group nodes", () => {
      const saveConfigMock = jest.fn();
      const Test = createTest();

      const root = mount(
        <Test {...sharedProps} saveConfig={saveConfigMock} expandedKeys={["name:Group1", "name:Nested Group"]} />
      );

      Test.result.mock.calls[0][0].toggleNodeExpanded("name:Group1");
      const expected = ["name:Nested Group"];
      expect(saveConfigMock.mock.calls[0][0]).toEqual({ expandedKeys: expected });

      root.setProps({ expandedKeys: expected });
      Test.result.mock.calls[1][0].toggleNodeExpanded("name:Nested Group");
      expect(saveConfigMock.mock.calls[1][0]).toEqual({ expandedKeys: [] });
    });

    it("toggles expanded state for topic nodes", () => {
      const saveConfigMock = jest.fn();
      const Test = createTest();

      const root = mount(
        <Test {...sharedProps} saveConfig={saveConfigMock} expandedKeys={["t:/foo", "t:/some_topic"]} />
      );

      Test.result.mock.calls[0][0].toggleNodeExpanded("t:/foo");
      const expected = ["t:/some_topic"];
      expect(saveConfigMock.mock.calls[0][0]).toEqual({ expandedKeys: expected });

      root.setProps({ checkedKeys: expected });
      Test.result.mock.calls[1][0].toggleNodeExpanded("t:/webviz_source_2/bar");
      expect(saveConfigMock.mock.calls[1][0]).toEqual({
        expandedKeys: ["t:/foo", ...expected, "t:/webviz_source_2/bar"],
      });
    });

    it("disables toggling when filtering", () => {
      const saveConfigMock = jest.fn();
      const Test = createTest();

      mount(
        <Test {...sharedProps} saveConfig={saveConfigMock} expandedKeys={["t:/foo", "t:/some_topic"]} filterText="f" />
      );

      Test.result.mock.calls[0][0].toggleNodeExpanded("t:/foo");
      expect(saveConfigMock).not.toHaveBeenCalled();
    });
  });

  describe("When text filtering", () => {
    const availableNamespacesByTopic = { "/foo": ["ns1", "ns2"], "/bar": ["namespace"] };

    function validateVisibilityByNodeKey(visibiltyByNodeKey, rootTreeNode, getIsTreeNodeVisibleInTree) {
      for (const key of Object.keys(visibiltyByNodeKey)) {
        expect(visibiltyByNodeKey[key]).toEqual(getIsTreeNodeVisibleInTree(key));
      }
    }

    it("allows searching for a namespace", () => {
      const Test = createTest();
      mount(
        <Test
          {...sharedProps}
          checkedKeys={["t:/foo", "t:/some_topic"]}
          availableNamespacesByTopic={availableNamespacesByTopic}
          filterText="ns1"
        />
      );

      const { rootTreeNode, getIsTreeNodeVisibleInTree } = Test.result.mock.calls[0][0];
      const visibiltyByNodeKey = {
        // first group
        "name:Group1": true,
        "t:/foo": true,
        "ns:/foo:ns1": true,
        "ns:/foo:ns2": false,
        // second group
        "name:Group2": false,
        "name:Nested Group": false,
        "t:/bar": false,
        "ns:/bar:namespace": false,
      };
      validateVisibilityByNodeKey(visibiltyByNodeKey, rootTreeNode, getIsTreeNodeVisibleInTree);
    });

    it("allows searching for a topic", () => {
      const Test = createTest();
      mount(
        <Test
          {...sharedProps}
          checkedKeys={["t:/foo", "t:/some_topic"]}
          availableNamespacesByTopic={availableNamespacesByTopic}
          filterText="/foo"
        />
      );

      const { rootTreeNode, getIsTreeNodeVisibleInTree } = Test.result.mock.calls[0][0];
      const visibiltyByNodeKey = {
        // first group
        "name:Group1": true,
        "t:/foo": true,
        "ns:/foo:ns1": true,
        "ns:/foo:ns2": true,
        // second group
        "name:Group2": false,
        "name:Nested Group": false,
        "t:/bar": false,
        "ns:/bar:namespace": false,
      };
      validateVisibilityByNodeKey(visibiltyByNodeKey, rootTreeNode, getIsTreeNodeVisibleInTree);
    });

    it("allows searching for a group", () => {
      const Test = createTest();
      mount(
        <Test
          {...sharedProps}
          checkedKeys={["t:/foo", "t:/some_topic"]}
          availableNamespacesByTopic={availableNamespacesByTopic}
          filterText="Group1"
        />
      );

      const { rootTreeNode, getIsTreeNodeVisibleInTree } = Test.result.mock.calls[0][0];
      const visibiltyByNodeKey = {
        // first group
        "name:Group1": true,
        "t:/foo": true,
        "ns:/foo:ns1": true,
        "ns:/foo:ns2": true,
        // second group
        "name:Group2": false,
        "name:Nested Group": false,
        "t:/bar": false,
        "ns:/bar:namespace": false,
      };
      validateVisibilityByNodeKey(visibiltyByNodeKey, rootTreeNode, getIsTreeNodeVisibleInTree);
    });

    it("does not allow searching for the root node", () => {
      const Test = createTest();
      mount(
        <Test
          {...sharedProps}
          checkedKeys={["t:/foo", "t:/some_topic"]}
          availableNamespacesByTopic={availableNamespacesByTopic}
          filterText="root"
        />
      );

      const { rootTreeNode, getIsTreeNodeVisibleInTree } = Test.result.mock.calls[0][0];
      const visibiltyByNodeKey = {
        // first group
        "name:Group1": false,
        "t:/foo": false,
        "ns:/foo:ns1": false,
        "ns:/foo:ns2": false,
        // second group
        "name:Group2": false,
        "name:Nested Group": false,
        "t:/bar": false,
        "ns:/bar:namespace": false,
      };
      validateVisibilityByNodeKey(visibiltyByNodeKey, rootTreeNode, getIsTreeNodeVisibleInTree);
    });

    it("without a search text, returns shouldExpandAllKeys=false", async () => {
      const Test = createTest();
      mount(
        <Test
          {...sharedProps}
          checkedKeys={["t:/foo", "t:/some_topic"]}
          availableNamespacesByTopic={availableNamespacesByTopic}
        />
      );

      const { shouldExpandAllKeys } = Test.result.mock.calls[0][0];
      expect(shouldExpandAllKeys).toEqual(false);
    });

    it("with a search text, returns shouldExpandAllKeys=true", async () => {
      const Test = createTest();
      mount(
        <Test
          {...sharedProps}
          checkedKeys={["t:/foo", "t:/some_topic"]}
          availableNamespacesByTopic={availableNamespacesByTopic}
          filterText="t"
        />
      );

      const { allKeys, shouldExpandAllKeys } = Test.result.mock.calls[0][0];
      expect(shouldExpandAllKeys).toEqual(true);
      expect(allKeys).toEqual(["name:root", "name:Group1", "t:/foo", "name:Group2", "name:Nested Group", "t:/bar"]);
    });
  });

  describe("sceneErrorsByKey", () => {
    it("aggregates errors at group level", async () => {
      const Test = createTest();
      const root = mount(
        <Test
          {...sharedProps}
          providerTopics={makeTopics(["/some_topic", "/webviz_source_2/some_topic"])}
          sceneErrorsByTopicKey={{
            "t:/bar": ["some err1"],
            "t:/some_topic": ["some err1", "some err2"],
            "t:/webviz_source_2/some_topic": ["some err1"],
          }}
        />
      );
      expect(Test.result.mock.calls[0][0].sceneErrorsByKey).toEqual({
        "name:(Uncategorized)": [
          "/some_topic: some err1",
          "/some_topic: some err2",
          "/webviz_source_2/some_topic: some err1",
        ],
        "name:Group2": ["/bar: some err1"],
        "name:Nested Group": ["/bar: some err1"],
        "t:/bar": ["some err1"],
        "t:/some_topic": ["some err1", "some err2"],
        "t:/webviz_source_2/some_topic": ["some err1"],
      });

      root.setProps({ sceneErrorsByTopicKey: { "t:/foo": ["some err"] } });
      expect(Test.result.mock.calls[1][0].sceneErrorsByKey).toEqual({
        "name:Group1": ["/foo: some err"],
        "t:/foo": ["some err"],
      });
    });
  });
});
