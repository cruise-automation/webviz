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
  getTopicGroups,
} from "./topicGroupsUtils";
import type { TopicGroupConfig } from "webviz-core/src/panels/ThreeDimensionalViz/TopicGroups/types";

const TOPIC_GROUPS_CONFIG: TopicGroupConfig[] = [
  {
    displayName: "My Topic Group",
    visible: true,
    expanded: true,
    items: [
      {
        topicName: "/tf",
        expanded: true,
        selectedNamespacesBySource: { "": ["some_tf_ns1"], "/webviz_bag_2": ["some_tf_ns1", "some_tf_ns2"] },
        visibilitiesBySource: { "": true },
      },
      {
        topicName: "/metadata",
        displayName: "Map",
        visibilitiesBySource: { "": true },
      },
      {
        topicName: "/some_topic_1",
        visibilitiesBySource: { "": true, "/webviz_bag_2": true },
      },
      {
        topicName: "/webviz_labels/some_label_topic_1",
      },
      {
        topicName: "/some_topic_2",
        expanded: true,
        visibilitiesBySource: { "": false, "/webviz_bag_2": true },
        selectedNamespacesBySource: {
          "": ["some_topic_2_ns1"],
          "/webviz_bag_2": ["some_topic_2_ns1", "some_topic_2_ns2"],
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
    displayName: "Some Topic Group 1",
    visible: false,
    expanded: true,
    items: [
      {
        topicName: "/tf",
      },
      {
        topicName: "/some_topic_2",
        expanded: true,
      },
      {
        topicName: "/tables/some_topic",
        visibilitiesBySource: { "": true, "/webviz_tables_2": true },
        settingsBySource: {
          "/webviz_tables_2": {
            overrideColor: "0, 0, 255, 0.5",
            overrideCommand: "LinedConvexHull",
          },
        },
      },
      {
        topicName: "/tables/some_topic_with_ns",
        expanded: true,
        visibilitiesBySource: { "": true, "/webviz_tables_2": true },
      },
    ],
  },
];
const AVAILABLE_TOPICS = [
  { name: "/some_topic_2", datatype: "visualization_msgs/MarkerArray" },
  { name: "/webviz_bag_2/some_topic_2", datatype: "visualization_msgs/MarkerArray" },
  { name: "/webviz_bag_3/some_topic_2", datatype: "visualization_msgs/MarkerArray" },
  {
    name: "/tables/some_topic",
    datatype: "visualization_msgs/MarkerArray",
  },
  {
    name: "/webviz_tables_2/tables/some_topic",
    datatype: "visualization_msgs/MarkerArray",
  },
  {
    name: "/webviz_tables_2/tables/some_topic_with_ns",
    datatype: "visualization_msgs/MarkerArray",
  },
  {
    name: "/webviz_labels/some_label_topic",
    datatype: "visualization_msgs/MarkerArray",
  },
  {
    name: "/tf",
    datatype: "tf2_msgs/TFMessage",
  },
];

const AVAILABLE_NAMESPACES = {
  "/some_topic_2": ["some_topic_2_ns1", "some_topic_2_ns2"],
  "/webviz_bag_2/some_topic_2": ["some_topic_2_ns1", "some_topic_2_ns2"],
  "/webviz_tables_2/tables/some_topic_with_ns": ["some_ns1", "some_ns2"],
};

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

  describe("getTopicGroups", () => {
    it("generates topic group config based on groupsConfig", () => {
      expect(
        getTopicGroups(
          [
            { displayName: "Some Group1", items: [{ topicName: "/tf" }] },
            { displayName: "Some Group2", items: [{ topicName: "/some_topic1" }] },
          ],
          { availableTopics: [], namespacesByTopic: {}, displayNameByTopic: {} }
        )
      ).toEqual([
        {
          derivedFields: { id: "Some-Group1_0" },
          displayName: "Some Group1",
          expanded: true,
          items: [
            {
              derivedFields: {
                availablePrefixes: [],
                displayName: "/tf",
                displayVisibilityBySource: {},
                id: "Some-Group1_0_0",
                namespaceItems: [],
              },
              topicName: "/tf",
            },
          ],
          visible: true,
        },
        {
          derivedFields: { id: "Some-Group2_1" },
          displayName: "Some Group2",
          expanded: false,
          items: [
            {
              derivedFields: {
                availablePrefixes: [],
                displayName: "/some_topic1",
                displayVisibilityBySource: {},
                id: "Some-Group2_1_0",
                namespaceItems: [],
              },
              topicName: "/some_topic1",
            },
          ],
          visible: false,
        },
      ]);
    });

    it("updates the groups based on available topics, namespaces and displayNames", () => {
      expect(
        getTopicGroups(
          [
            { displayName: "Some Group1", items: [{ topicName: "/tf" }] },
            { displayName: "Some Group2", items: [{ topicName: "/some_topic1" }] },
          ],
          {
            displayNameByTopic: { "/tf": "Transforms", "/some_topic1": "Some Topic 1" },
            namespacesByTopic: { "/tf": ["tf_ns1", "tf_ns2"] },
            availableTopics: [
              { name: "/tf", datatype: "visualization_msgs/MarkerArray" },
              { name: "/webviz_bag_2/some_topic_2", datatype: "visualization_msgs/MarkerArray" },
            ],
          }
        )
      ).toEqual([
        {
          derivedFields: { id: "Some-Group1_0" },
          displayName: "Some Group1",
          expanded: true,
          items: [
            {
              derivedFields: {
                availablePrefixes: [""],
                datatype: "visualization_msgs/MarkerArray",
                displayName: "Transforms",
                displayVisibilityBySource: {
                  "": { available: true, badgeText: "B1", isParentVisible: false, visible: true },
                },
                id: "Some-Group1_0_0",
                namespaceItems: [
                  {
                    displayVisibilityBySource: {
                      "": { available: true, badgeText: "B1", isParentVisible: false, visible: true },
                    },
                    name: "tf_ns1",
                  },
                  {
                    displayVisibilityBySource: {
                      "": { available: true, badgeText: "B1", isParentVisible: false, visible: true },
                    },
                    name: "tf_ns2",
                  },
                ],
              },
              topicName: "/tf",
            },
          ],
          visible: true,
        },
        {
          derivedFields: { id: "Some-Group2_1" },
          displayName: "Some Group2",
          expanded: false,
          items: [
            {
              derivedFields: {
                availablePrefixes: [],
                displayName: "Some Topic 1",
                displayVisibilityBySource: {},
                id: "Some-Group2_1_0",
                namespaceItems: [],
              },
              topicName: "/some_topic1",
            },
          ],
          visible: false,
        },
      ]);
    });

    it("generates topic group config for two bags", () => {
      expect(
        getTopicGroups([{ displayName: "Some Group", items: [{ topicName: "/some_topic1" }] }], {
          availableTopics: [
            { name: "/some_topic1", datatype: "visualization_msgs/MarkerArray" },
            { name: "/webviz_bag_2/some_topic1", datatype: "visualization_msgs/MarkerArray" },
          ],
          namespacesByTopic: {},
          displayNameByTopic: {},
        })
      ).toEqual([
        {
          derivedFields: { id: "Some-Group_0" },
          displayName: "Some Group",
          expanded: true,
          items: [
            {
              derivedFields: {
                availablePrefixes: ["", "/webviz_bag_2"],
                datatype: "visualization_msgs/MarkerArray",
                displayName: "/some_topic1",
                displayVisibilityBySource: {
                  "": { available: true, badgeText: "B1", isParentVisible: false, visible: true },
                  "/webviz_bag_2": { available: true, badgeText: "B2", isParentVisible: false, visible: true },
                },
                id: "Some-Group_0_0",
                namespaceItems: [],
              },
              topicName: "/some_topic1",
            },
          ],
          visible: true,
        },
      ]);
    });

    it("generates topic group config multiple data sources (bags + tables + labels)", () => {
      expect(
        getTopicGroups(TOPIC_GROUPS_CONFIG, {
          availableTopics: AVAILABLE_TOPICS,
          namespacesByTopic: AVAILABLE_NAMESPACES,
          displayNameByTopic: {},
        })
      ).toMatchSnapshot();
    });
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
