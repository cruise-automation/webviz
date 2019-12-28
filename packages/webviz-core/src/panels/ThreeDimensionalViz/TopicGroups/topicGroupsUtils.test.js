// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

/* eslint-disable jest/no-disabled-tests */
import {
  buildItemDisplayNameByTopicOrExtension,
  removeTopicPrefixes,
  buildAvailableNamespacesByTopic,
  getSelectionsFromTopicGroupConfig,
} from "./topicGroupsUtils";

const DEFAULT_TOPIC_CONFIG = {
  name: "root",
  children: [
    {
      name: "Ext A",
      extension: "ExtA.a",
      children: [
        {
          name: "Ext B",
          extension: "ExtB.b",
        },
        {
          name: "Ext C",
          extension: "ExtC.c",
        },
      ],
    },
    {
      name: "Some Topic in JSON Tree",
      topic: "/topic_in_json_tree",
    },
    {
      name: "TF",
      children: [],
      description: "Visualize relationships between /tf frames.",
    },
    {
      name: "Nested Group",
      children: [
        {
          name: "Topic A",
          topic: "/topic_a",
        },
        {
          name: "Topic B",
          topic: "/topic_b",
        },
        {
          name: "Deeply Nested Group",
          children: [{ topic: "/topic_c" }],
        },
        {
          topic: "/topic_d",
        },
      ],
    },
  ],
};

jest.mock("webviz-core/src/loadWebviz", () => ({
  getGlobalHooks: () => ({
    perPanelHooks: () => ({
      ThreeDimensionalViz: {
        getDefaultTopicTree: () => ({
          name: "root",
          children: [
            {
              name: "Ext A",
              extension: "ExtA.a",
              children: [
                {
                  name: "Ext B",
                  extension: "ExtB.b",
                },
                {
                  name: "Ext C",
                  extension: "ExtC.c",
                },
              ],
            },
            {
              name: "Some Topic in JSON Tree",
              topic: "/topic_in_json_tree",
            },
            {
              name: "TF",
              children: [],
              description: "Visualize relationships between /tf frames.",
            },
            {
              name: "Nested Group",
              children: [
                {
                  name: "Topic A",
                  topic: "/topic_a",
                },
                {
                  name: "Topic B",
                  topic: "/topic_b",
                },
                {
                  name: "Deeply Nested Group",
                  children: [{ topic: "/topic_c" }],
                },
                {
                  topic: "/topic_d",
                },
              ],
            },
          ],
        }),
      },
    }),
  }),
}));

describe("topicGroupUtils", () => {
  describe("removeTopicPrefixes", () => {
    it("removes webviz bag prefixes", () => {
      expect(
        removeTopicPrefixes([
          "/foo/bar",
          "/webviz_bag_2/foo",
          "/webviz_tables_2/some_table2_topic",
          "/webviz_labels/some_label_topic",
        ])
      ).toEqual(["/foo/bar", "/foo", "/some_table2_topic", "/some_label_topic"]);
    });
  });

  describe("buildItemDisplayNameByTopicOrExtension", () => {
    it("maps extension and topic to displayName", () => {
      expect(buildItemDisplayNameByTopicOrExtension(DEFAULT_TOPIC_CONFIG)).toEqual({
        "/metadata": "Map",
        "/tf": "TF",
        "/topic_a": "Nested Group / Topic A",
        "/topic_b": "Nested Group / Topic B",
        "/topic_c": "Nested Group / Deeply Nested Group",
        "/topic_d": "Nested Group",
        "/topic_in_json_tree": "Some Topic in JSON Tree",
        "ExtA.a": "Ext A",
        "ExtB.b": "Ext A / Ext B",
        "ExtC.c": "Ext A / Ext C",
      });
    });
  });
  describe("buildAvailableNamespacesByTopic", () => {
    it("builds a map of topics to namespaces including metadata, tf and topic namespaces", () => {
      expect(
        buildAvailableNamespacesByTopic({
          topicConfig: DEFAULT_TOPIC_CONFIG,
          allNamespaces: [
            { name: "some_ns1", topic: "/topic_a" },
            { name: "some_ns2", topic: "/topic_a" },
            { name: "some_ns1", topic: "/webviz_bag_2/topic_a" },
            { name: "some_ns1", topic: "/topic_c" },
          ],
          transformIds: ["some_tf_id1", "some_tf_id2"],
        })
      ).toEqual({
        "/metadata": ["ExtA.a", "ExtB.b", "ExtC.c"],
        "/tf": ["some_tf_id1", "some_tf_id2"],
        "/topic_a": ["some_ns1", "some_ns2"],
        "/topic_c": ["some_ns1"],
        "/webviz_bag_2/topic_a": ["some_ns1"],
      });
    });
  });

  // TODO(Audrey): finish the tests
  describe.skip("getTopicGroups", () => {
    it("generates topic group config for single bag", () => {});
    it("generates topic group config for two bags", () => {});
    it("generates topic group config for multiple data sources (bags + tables + labels)", () => {});
  });

  describe.skip("getNamespacesItemsBySource", () => {
    it("generates namespaces items with displayVisibilityBySource (hidden + available + badgeText)", () => {});
  });
  describe("getSelectionsFromTopicGroupConfig", () => {
    it("handles empty input", () => {
      expect(getSelectionsFromTopicGroupConfig([])).toEqual({
        selectedTopicNames: [],
        selectedNamespacesByTopic: {},
        selectedTopicSettingsByTopic: {},
      });
    });
    it("returns selectedTopicNames and selectedNamespacesByTopic", () => {
      expect(
        getSelectionsFromTopicGroupConfig([
          {
            displayName: "My Topic Group",
            visible: true,
            expanded: true,
            items: [
              // when missing visibilitiesBySource, select the non-prefixed topic as visible
              {
                topicName: "/topic_a",
              },
              {
                topicName: "/topic_b",
                visibilitiesBySource: { "/webviz_bag_2": false },
              },
              {
                topicName: "/topic_c",
                visibilitiesBySource: { "": true },
              },
              {
                topicName: "/topic_d",
                visibilitiesBySource: { "": false },
              },
              // omit topic if all data sources are not visible
              {
                topicName: "/topic_e",
                visibilitiesBySource: { "": false, "/webviz_bag_2": false },
              },
              {
                topicName: "/topic_f",
                visibilitiesBySource: { "": false, "/webviz_bag_2": true },
                selectedNamespacesBySource: {
                  "": ["some_ns11", "some_ns22"],
                  "/webviz_bag_2": ["some_ns33"],
                },
              },
              {
                topicName: "/topic_g",
                selectedNamespacesBySource: {
                  "": ["some_ns1", "some_ns2"],
                  "/webviz_bag_2": ["some_ns3"],
                },
                settingsBySource: {
                  "": {
                    overrideColor: "128, 0, 0, 1",
                    overrideCommand: "LinedConvexHull",
                  },
                  "/webviz_bag_2": {
                    overrideColor: "0, 128, 0, 1",
                    overrideCommand: "LinedConvexHull",
                  },
                },
              },
            ],
          },
          {
            displayName: "My Topic Group1",
            // all topics under this group won't be processed since the group is not visible
            visible: false,
            expanded: true,
            items: [
              {
                topicName: "/topic_h",
              },
            ],
          },
        ])
      ).toEqual({
        selectedNamespacesByTopic: {
          "/topic_f": ["some_ns11", "some_ns22"],
          "/webviz_bag_2/topic_f": ["some_ns33"],
          "/topic_g": ["some_ns1", "some_ns2"],
        },
        selectedTopicNames: ["/topic_a", "/topic_c", "/webviz_bag_2/topic_f", "/topic_g"],
        selectedTopicSettingsByTopic: {
          "/topic_g": {
            overrideColor: "128, 0, 0, 1",
            overrideCommand: "LinedConvexHull",
          },
          "/webviz_bag_2/topic_g": {
            overrideColor: "0, 128, 0, 1",
            overrideCommand: "LinedConvexHull",
          },
        },
      });
    });
  });
});
