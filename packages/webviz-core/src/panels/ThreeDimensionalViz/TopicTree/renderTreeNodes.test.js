// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { getNamespaceNodes } from "./renderTreeNodes";

const TOPIC_NAME = "/foo";
const UNAVAILABLE_TOPIC_NAME = "/foo_unavailable";
const AVAILABLE_TOPIC_NAME = "/foo_base_feature_available";
const BASE_AVAILABLE_TOPIC_NAME = "/foo_base_available";
const FEATURE_AVAILABLE_TOPIC_NAME = "/foo_feature_available";
const CHECKED_BY_DEFAULT_TOPIC_NAME = "/foo_checked_by_default";
const CHECKED_BY_CHECKED_KEYS_TOPIC_NAME = "/foo_checked_by_checked_keys";
const INVISIBLE_NAMESPACE = "ns_invisible";

const getIsNamespaceCheckedByDefaultMock = (topicName) => {
  return (topic, columnIndex) => {
    if (topicName === UNAVAILABLE_TOPIC_NAME) {
      return false;
    }
    if (topicName === BASE_AVAILABLE_TOPIC_NAME) {
      return columnIndex === 0;
    }
    if (topicName === FEATURE_AVAILABLE_TOPIC_NAME) {
      return columnIndex === 1;
    }
    if (topicName === CHECKED_BY_DEFAULT_TOPIC_NAME) {
      return true;
    }
    if (topicName === TOPIC_NAME) {
      return true;
    }
    return false;
  };
};

const getIsTreeNodeVisibleInSceneMock = (topicName) => {
  return (node, columnIndex, namespace) => {
    if (topicName === UNAVAILABLE_TOPIC_NAME) {
      return false;
    }
    if (topicName === BASE_AVAILABLE_TOPIC_NAME) {
      return columnIndex === 0;
    }
    if (topicName === FEATURE_AVAILABLE_TOPIC_NAME) {
      return columnIndex === 1;
    }
    if (topicName === CHECKED_BY_DEFAULT_TOPIC_NAME) {
      return true;
    }
    if (topicName === CHECKED_BY_CHECKED_KEYS_TOPIC_NAME) {
      return true;
    }
    if (namespace === INVISIBLE_NAMESPACE) {
      return false;
    }
    if (topicName === TOPIC_NAME) {
      return true;
    }
    return false;
  };
};

describe("getNamespaceNodes", () => {
  it("returns namespace nodes when topics are not unavailable (for statically available namespaces)", () => {
    const topicName = UNAVAILABLE_TOPIC_NAME;

    expect(
      getNamespaceNodes({
        availableNamespacesByTopic: { [topicName]: ["ns1", "ns2"] },
        checkedKeysSet: new Set(),
        getIsNamespaceCheckedByDefault: getIsNamespaceCheckedByDefaultMock(topicName),
        getIsTreeNodeVisibleInScene: getIsTreeNodeVisibleInSceneMock(topicName),
        hasFeatureColumn: false,
        node: {
          type: "topic",
          topicName,
          key: `t:/${topicName}`,
          featureKey: `t:/webviz_source_2/${topicName}`,
          providerAvailable: false,
          availableByColumn: [true],
        },
        showVisible: false,
      })
    ).toEqual([
      {
        availableByColumn: [true],
        checkedByColumn: [false],
        featureKey: "ns:/webviz_source_2/foo_unavailable:ns1",
        key: "ns:/foo_unavailable:ns1",
        namespace: "ns1",
        visibleInSceneByColumn: [false],
      },
      {
        availableByColumn: [true],
        checkedByColumn: [false],
        featureKey: "ns:/webviz_source_2/foo_unavailable:ns2",
        key: "ns:/foo_unavailable:ns2",
        namespace: "ns2",
        visibleInSceneByColumn: [false],
      },
    ]);
  });
  it("returns namespace nodes when only base topics are available", () => {
    const topicName = BASE_AVAILABLE_TOPIC_NAME;
    expect(
      getNamespaceNodes({
        availableNamespacesByTopic: { [topicName]: ["ns1", "ns2"] },
        checkedKeysSet: new Set([`t:${topicName}`]),
        getIsNamespaceCheckedByDefault: getIsNamespaceCheckedByDefaultMock(topicName),
        getIsTreeNodeVisibleInScene: getIsTreeNodeVisibleInSceneMock(topicName),
        hasFeatureColumn: false,
        node: {
          type: "topic",
          topicName,
          key: `t:${topicName}`,
          featureKey: `t:/webviz_source_2${topicName}`,
          providerAvailable: false,
          availableByColumn: [true],
        },
        showVisible: false,
      })
    ).toEqual([
      {
        availableByColumn: [true],
        checkedByColumn: [true],
        featureKey: "ns:/webviz_source_2/foo_base_available:ns1",
        key: "ns:/foo_base_available:ns1",
        namespace: "ns1",
        visibleInSceneByColumn: [true],
      },
      {
        availableByColumn: [true],
        checkedByColumn: [true],
        featureKey: "ns:/webviz_source_2/foo_base_available:ns2",
        key: "ns:/foo_base_available:ns2",
        namespace: "ns2",
        visibleInSceneByColumn: [true],
      },
    ]);
  });

  it("returns namespace nodes when base and feature topics are available (only base selected)", () => {
    const topicName = BASE_AVAILABLE_TOPIC_NAME;
    expect(
      getNamespaceNodes({
        availableNamespacesByTopic: { [topicName]: ["ns1", "ns2"] },
        checkedKeysSet: new Set([`t:${topicName}`]),
        getIsNamespaceCheckedByDefault: getIsNamespaceCheckedByDefaultMock(topicName),
        getIsTreeNodeVisibleInScene: getIsTreeNodeVisibleInSceneMock(topicName),
        hasFeatureColumn: true,
        node: {
          type: "topic",
          topicName,
          key: `t:${topicName}`,
          featureKey: `t:/webviz_source_2${topicName}`,
          providerAvailable: true,
          availableByColumn: [true, false],
        },
        showVisible: false,
      })
    ).toEqual([
      {
        availableByColumn: [true, false],
        checkedByColumn: [true, false],
        featureKey: "ns:/webviz_source_2/foo_base_available:ns1",
        key: "ns:/foo_base_available:ns1",
        namespace: "ns1",
        visibleInSceneByColumn: [true, false],
      },
      {
        availableByColumn: [true, false],
        checkedByColumn: [true, false],
        featureKey: "ns:/webviz_source_2/foo_base_available:ns2",
        key: "ns:/foo_base_available:ns2",
        namespace: "ns2",
        visibleInSceneByColumn: [true, false],
      },
    ]);
  });
  it("returns namespace nodes when base and feature topics are available (only feature selected)", () => {
    const topicName = FEATURE_AVAILABLE_TOPIC_NAME;
    expect(
      getNamespaceNodes({
        availableNamespacesByTopic: { [`/webviz_source_2${topicName}`]: ["ns1", "ns2"] },
        checkedKeysSet: new Set([`t:/webviz_source_/2${topicName}`]),
        getIsNamespaceCheckedByDefault: getIsNamespaceCheckedByDefaultMock(topicName),
        getIsTreeNodeVisibleInScene: getIsTreeNodeVisibleInSceneMock(topicName),
        hasFeatureColumn: true,
        node: {
          type: "topic",
          topicName,
          key: `t:${topicName}`,
          featureKey: `t:/webviz_source_2${topicName}`,
          providerAvailable: true,
          availableByColumn: [false, true],
        },
        showVisible: false,
      })
    ).toEqual([
      {
        availableByColumn: [false, true],
        checkedByColumn: [false, true],
        featureKey: "ns:/webviz_source_2/foo_feature_available:ns1",
        key: "ns:/foo_feature_available:ns1",
        namespace: "ns1",
        visibleInSceneByColumn: [false, true],
      },
      {
        availableByColumn: [false, true],
        checkedByColumn: [false, true],
        featureKey: "ns:/webviz_source_2/foo_feature_available:ns2",
        key: "ns:/foo_feature_available:ns2",
        namespace: "ns2",
        visibleInSceneByColumn: [false, true],
      },
    ]);
  });

  it("does not have duplicates namespace names", () => {
    const topicName = AVAILABLE_TOPIC_NAME;
    const nsNodes = getNamespaceNodes({
      availableNamespacesByTopic: {
        [topicName]: ["ns1", "ns3"],
        [`/webviz_source_2${topicName}`]: ["ns1", "ns2"],
      },
      checkedKeysSet: new Set([`t:${topicName}`, `t:/webviz_source_2${topicName}`]),
      getIsNamespaceCheckedByDefault: getIsNamespaceCheckedByDefaultMock(topicName),
      getIsTreeNodeVisibleInScene: getIsTreeNodeVisibleInSceneMock(topicName),
      hasFeatureColumn: true,
      node: {
        type: "topic",
        topicName,
        key: `t:${topicName}`,
        featureKey: `t:/webviz_source_2${topicName}`,
        providerAvailable: true,
        availableByColumn: [true, true],
      },
      showVisible: false,
    });
    expect(nsNodes.map((node) => node.namespace)).toEqual(["ns1", "ns3", "ns2"]);
  });

  it("handles namespaces checked by default", () => {
    const topicName = CHECKED_BY_DEFAULT_TOPIC_NAME;
    const nsNodes = getNamespaceNodes({
      availableNamespacesByTopic: {
        [topicName]: ["ns1", "ns3"],
        [`/webviz_source_2${topicName}`]: ["ns1", "ns2"],
      },
      checkedKeysSet: new Set([`t:${topicName}`, `t:/webviz_source_2${topicName}`]),
      getIsNamespaceCheckedByDefault: getIsNamespaceCheckedByDefaultMock(topicName),
      getIsTreeNodeVisibleInScene: getIsTreeNodeVisibleInSceneMock(topicName),
      hasFeatureColumn: true,
      node: {
        type: "topic",
        topicName,
        key: `t:${topicName}`,
        featureKey: `t:/webviz_source_2${topicName}`,
        providerAvailable: true,
        availableByColumn: [true, true],
      },
      showVisible: false,
    });
    expect(nsNodes.map(({ checkedByColumn, namespace }) => ({ checkedByColumn, namespace }))).toEqual([
      { checkedByColumn: [true, true], namespace: "ns1" },
      { checkedByColumn: [true, true], namespace: "ns3" },
      { checkedByColumn: [true, true], namespace: "ns2" },
    ]);
  });

  it("handles namespaces checked by checkedKeys", () => {
    const topicName = CHECKED_BY_CHECKED_KEYS_TOPIC_NAME;
    const nsNodes = getNamespaceNodes({
      availableNamespacesByTopic: {
        [topicName]: ["ns1", "ns3"],
        [`/webviz_source_2${topicName}`]: ["ns1", "ns2"],
      },
      checkedKeysSet: new Set([
        `t:${topicName}`,
        `ns:${topicName}:ns1`,
        `t:/webviz_source_2${topicName}`,
        `ns:/webviz_source_2${topicName}:ns2`,
      ]),
      getIsNamespaceCheckedByDefault: getIsNamespaceCheckedByDefaultMock(topicName),
      getIsTreeNodeVisibleInScene: getIsTreeNodeVisibleInSceneMock(topicName),
      hasFeatureColumn: true,
      node: {
        type: "topic",
        topicName,
        key: `t:${topicName}`,
        featureKey: `t:/webviz_source_2${topicName}`,
        providerAvailable: true,
        availableByColumn: [true, true],
      },
      showVisible: false,
    });

    expect(nsNodes.map(({ checkedByColumn, namespace }) => ({ checkedByColumn, namespace }))).toEqual([
      { checkedByColumn: [true, false], namespace: "ns1" },
      { checkedByColumn: [false, false], namespace: "ns3" },
      { checkedByColumn: [false, true], namespace: "ns2" },
    ]);
  });

  it("does not return invisible nodes when showVisible is true", () => {
    const topicName = TOPIC_NAME;
    const nsNodes = getNamespaceNodes({
      availableNamespacesByTopic: {
        [topicName]: ["ns1", INVISIBLE_NAMESPACE],
        [`/webviz_source_2${topicName}`]: ["ns1", "ns2"],
      },
      checkedKeysSet: new Set([
        `t:${topicName}`,
        `ns:${topicName}:ns1`,
        `t:/webviz_source_2${topicName}`,
        `ns:/webviz_source_2${topicName}:ns2`,
      ]),
      getIsNamespaceCheckedByDefault: getIsNamespaceCheckedByDefaultMock(topicName),
      getIsTreeNodeVisibleInScene: getIsTreeNodeVisibleInSceneMock(topicName),
      hasFeatureColumn: true,
      node: {
        type: "topic",
        topicName,
        key: `t:${topicName}`,
        featureKey: `t:/webviz_source_2${topicName}`,
        providerAvailable: true,
        availableByColumn: [true, true],
      },
      showVisible: true,
    });
    expect(nsNodes.map((node) => node.namespace)).toEqual(["ns1", "ns2"]);
  });
});
