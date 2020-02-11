// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

/* eslint-disable jest/no-disabled-tests */
import { getFilteredKeys } from "./TopicGroups";
import {
  buildAvailableNamespacesByTopic,
  buildItemDisplayNameByTopicOrExtension,
  getSelectionsFromTopicGroupConfig,
  getTopicGroups,
  removeTopicPrefixes,
  transformTopicTree,
} from "./topicGroupsUtils";
import type { TopicGroupConfig } from "./types";

const TOPIC_GROUPS_CONFIG: TopicGroupConfig[] = [
  {
    displayName: "My Topic Group",
    expanded: true,
    items: [
      {
        topicName: "/tf",
        expanded: true,
        selectedNamespacesBySource: { "": ["some_tf_ns1"], "/webviz_bag_2": ["some_tf_ns1", "some_tf_ns2"] },
        visibilityBySource: { "": true },
      },
      { topicName: "/metadata", displayName: "Map", visibilityBySource: { "": true } },
      { topicName: "/some_topic_1", visibilityBySource: { "": true, "/webviz_bag_2": true } },
      { topicName: "/webviz_labels/some_label_topic_1" },
      {
        topicName: "/some_topic_2",
        expanded: true,
        visibilityBySource: { "": false, "/webviz_bag_2": true },
        selectedNamespacesBySource: {
          "": ["some_topic_2_ns1"],
          "/webviz_bag_2": ["some_topic_2_ns1", "some_topic_2_ns2"],
        },
        settingsBySource: {
          "": { overrideColor: "128, 0, 0, 1", overrideCommand: "LinedConvexHull" },
          "/webviz_bag_2": { overrideColor: "0, 128, 0, 1", overrideCommand: "LinedConvexHull" },
        },
      },
    ],
  },
  {
    displayName: "Some Topic Group 1",
    visibilityBySource: {
      "": false,
      "/webviz_tables": false,
      "/webviz_labels": false,
      "/webviz_bag_2": false,
      "/webviz_tables_2": false,
    },
    expanded: true,
    items: [
      { topicName: "/tf" },
      { topicName: "/some_topic_2", expanded: true },
      {
        topicName: "/tables/some_topic",
        visibilityBySource: { "": true, "/webviz_tables_2": true },
        settingsBySource: {
          "/webviz_tables_2": { overrideColor: "0, 0, 255, 0.5", overrideCommand: "LinedConvexHull" },
        },
      },
      {
        topicName: "/tables/some_topic_with_ns",
        expanded: true,
        visibilityBySource: { "": true, "/webviz_tables_2": true },
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
      children: [{ name: "Ext B", extension: "ExtB.b" }, { name: "Ext C", extension: "ExtC.c" }],
    },
    { name: "Some Topic in JSON Tree", topic: "/topic_in_json_tree" },
    { name: "TF", children: [], description: "Visualize relationships between /tf frames." },
    {
      name: "Nested Group",
      children: [
        { name: "Topic A", topic: "/topic_a" },
        { name: "Topic B", topic: "/topic_b" },
        { name: "Deeply Nested Group", children: [{ topic: "/topic_c" }] },
        { topic: "/topic_d" },
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
              children: [{ name: "Ext B", extension: "ExtB.b" }, { name: "Ext C", extension: "ExtC.c" }],
            },
            { name: "Some Topic in JSON Tree", topic: "/topic_in_json_tree" },
            { name: "TF", children: [], description: "Visualize relationships between /tf frames." },
            {
              name: "Nested Group",
              children: [
                { name: "Topic A", topic: "/topic_a" },
                { name: "Topic B", topic: "/topic_b" },
                { name: "Deeply Nested Group", children: [{ topic: "/topic_c" }] },
                { topic: "/topic_d" },
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
          "/webviz_tables/some_table_topic",
          // Add another tables_2 topic to test that the order does not matter
          "/webviz_tables_2/another_table2_topic",
          "/webviz_labels/some_label_topic",
        ])
      ).toEqual([
        "/foo/bar",
        "/foo",
        "/some_table2_topic",
        "/some_table_topic",
        "/another_table2_topic",
        "/some_label_topic",
      ]);
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
          { availableTopics: [], namespacesByTopic: {}, displayNameByTopic: {}, errorsByTopic: {} }
        )
      ).toEqual([
        {
          derivedFields: { displayVisibilityBySourceByColumn: [], id: "Some-Group1_0", isShownInList: true },
          displayName: "Some Group1",
          expanded: true,
          items: [
            {
              derivedFields: {
                availablePrefixes: [],
                dataSourceBadgeSlots: 0,
                displayName: "/tf",
                displayVisibilityBySource: {},
                id: "Some-Group1_0_0",
                isBaseNamespaceAvailable: false,
                isBaseTopicAvailable: false,
                namespaceItems: [],
                isShownInList: true,
              },
              topicName: "/tf",
            },
          ],
        },
        {
          derivedFields: { displayVisibilityBySourceByColumn: [], id: "Some-Group2_1", isShownInList: true },
          displayName: "Some Group2",
          expanded: false,
          items: [
            {
              derivedFields: {
                availablePrefixes: [],
                dataSourceBadgeSlots: 0,
                displayName: "/some_topic1",
                displayVisibilityBySource: {},
                id: "Some-Group2_1_0",
                isBaseNamespaceAvailable: false,
                isBaseTopicAvailable: false,
                namespaceItems: [],
                isShownInList: true,
              },
              topicName: "/some_topic1",
            },
          ],
        },
      ]);
    });

    it("updates the groups based on available topics, namespaces, displayNames and errors", () => {
      expect(
        getTopicGroups(
          [
            { displayName: "Some Group1", items: [{ topicName: "/tf" }, { topicName: "/some_topic2" }] },
            { displayName: "Some Group2", items: [{ topicName: "/some_topic1" }] },
          ],
          {
            displayNameByTopic: { "/tf": "Transforms", "/some_topic1": "Some Topic 1" },
            namespacesByTopic: { "/tf": ["tf_ns1", "tf_ns2"] },
            availableTopics: [
              { name: "/tf", datatype: "visualization_msgs/MarkerArray" },
              { name: "/some_topic1", datatype: "visualization_msgs/MarkerArray" },
              { name: "/webviz_bag_2/some_topic2", datatype: "visualization_msgs/MarkerArray" },
            ],
            errorsByTopic: {
              ["/some_topic1"]: ["missing transforms to my_root_frame"],
              ["/webviz_bag_2/some_topic2"]: ["missing frame id"],
            },
          }
        )
      ).toEqual([
        {
          derivedFields: {
            displayVisibilityBySourceByColumn: [
              { visibilityBySource: { "": true, "/webviz_labels": true, "/webviz_tables": true }, visible: true },
              { visibilityBySource: { "/webviz_bag_2": true, "/webviz_tables_2": true }, visible: true },
            ],
            id: "Some-Group1_0",
            isShownInList: true,
          },
          displayName: "Some Group1",
          expanded: true,
          items: [
            {
              derivedFields: {
                availablePrefixes: [""],
                dataSourceBadgeSlots: 2,
                datatype: "visualization_msgs/MarkerArray",
                displayName: "Transforms",
                displayVisibilityBySource: {
                  "": { available: true, badgeText: "B1", isParentVisible: true, visible: true },
                },
                id: "Some-Group1_0_0",
                isBaseNamespaceAvailable: true,
                isBaseTopicAvailable: true,
                namespaceItems: [
                  {
                    displayVisibilityBySource: {
                      "": { available: true, badgeText: "B1", isParentVisible: true, visible: true },
                    },
                    name: "tf_ns1",
                  },
                  {
                    displayVisibilityBySource: {
                      "": { available: true, badgeText: "B1", isParentVisible: true, visible: true },
                    },
                    name: "tf_ns2",
                  },
                ],
                isShownInList: true,
              },
              topicName: "/tf",
            },
            {
              derivedFields: {
                availablePrefixes: ["/webviz_bag_2"],
                dataSourceBadgeSlots: 2,
                datatype: "visualization_msgs/MarkerArray",
                displayName: "/some_topic2",
                displayVisibilityBySource: {
                  "/webviz_bag_2": { available: true, badgeText: "B2", isParentVisible: true, visible: true },
                },
                errors: ["(/webviz_bag_2) missing frame id"],
                id: "Some-Group1_0_1",
                isBaseNamespaceAvailable: false,
                isBaseTopicAvailable: false,
                namespaceItems: [],
                isShownInList: true,
              },
              topicName: "/some_topic2",
            },
          ],
        },
        {
          derivedFields: {
            displayVisibilityBySourceByColumn: [
              { visibilityBySource: { "": false, "/webviz_labels": false, "/webviz_tables": false }, visible: false },
              { visibilityBySource: { "/webviz_bag_2": false, "/webviz_tables_2": false }, visible: false },
            ],
            id: "Some-Group2_1",
            isShownInList: true,
          },
          displayName: "Some Group2",
          expanded: false,
          items: [
            {
              derivedFields: {
                availablePrefixes: [""],
                dataSourceBadgeSlots: 2,
                datatype: "visualization_msgs/MarkerArray",
                displayName: "Some Topic 1",
                displayVisibilityBySource: {
                  "": { available: true, badgeText: "B1", isParentVisible: false, visible: true },
                },
                errors: ["missing transforms to my_root_frame"],
                id: "Some-Group2_1_0",
                isBaseNamespaceAvailable: false,
                isBaseTopicAvailable: true,
                namespaceItems: [],
                isShownInList: true,
              },
              topicName: "/some_topic1",
            },
          ],
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
          errorsByTopic: {},
        })
      ).toEqual([
        {
          derivedFields: {
            displayVisibilityBySourceByColumn: [
              { visibilityBySource: { "": true, "/webviz_labels": true, "/webviz_tables": true }, visible: true },
              { visibilityBySource: { "/webviz_bag_2": true, "/webviz_tables_2": true }, visible: true },
            ],
            id: "Some-Group_0",
            isShownInList: true,
          },
          displayName: "Some Group",
          expanded: true,
          items: [
            {
              derivedFields: {
                availablePrefixes: ["", "/webviz_bag_2"],
                dataSourceBadgeSlots: 2,
                datatype: "visualization_msgs/MarkerArray",
                displayName: "/some_topic1",
                displayVisibilityBySource: {
                  "": { available: true, badgeText: "B1", isParentVisible: true, visible: true },
                  "/webviz_bag_2": { available: true, badgeText: "B2", isParentVisible: true, visible: true },
                },
                id: "Some-Group_0_0",
                isBaseNamespaceAvailable: false,
                isBaseTopicAvailable: true,
                namespaceItems: [],
                isShownInList: true,
              },
              topicName: "/some_topic1",
            },
          ],
        },
      ]);
    });

    it("returns filtered results based on topic group displayName, topicName and topic displayNames", () => {
      const topicGroupConfig = [
        {
          // filtered because this group has topicName or topic displayName that match with the filter text
          displayName: "Some Group",
          items: [
            { topicName: "/some_topic1" },
            { topicName: "/some_topic2" },
            { topicName: "/some_topic3" },
            { topicName: "/some_topic4", displayName: "Display Name 4 1" },
          ],
        },
        // filtered because group displayName matches
        { displayName: "Some Group1", items: [{ topicName: "/some_topic2" }] },
        // filtered out because neither group nor topic matches
        { displayName: "Some Group2", items: [{ topicName: "/some_topic2" }] },
      ];
      const displayNameByTopic = {
        "/some_topic3": "Display Name 31",
      };
      const filterText = "1";
      const filteredKeysSet = new Set(getFilteredKeys(topicGroupConfig, displayNameByTopic, filterText));

      expect(
        getTopicGroups(topicGroupConfig, {
          availableTopics: [
            { name: "/some_topic1", datatype: "visualization_msgs/MarkerArray" },
            { name: "/webviz_bag_2/some_topic2", datatype: "visualization_msgs/MarkerArray" },
          ],
          namespacesByTopic: {},
          displayNameByTopic,
          errorsByTopic: {},
          filterText,
          filteredKeysSet,
        })
      ).toEqual([
        {
          displayName: "Some Group",
          expanded: true,
          derivedFields: {
            id: "Some-Group_0",
            displayVisibilityBySourceByColumn: [
              { visible: true, visibilityBySource: { "": true, "/webviz_tables": true, "/webviz_labels": true } },
              { visible: true, visibilityBySource: { "/webviz_bag_2": true, "/webviz_tables_2": true } },
            ],
            isShownInList: true,
            filterText: "1",
          },
          items: [
            {
              topicName: "/some_topic1",
              derivedFields: {
                id: "Some-Group_0_0",
                availablePrefixes: [""],
                isShownInList: true,
                dataSourceBadgeSlots: 2,
                displayName: "/some_topic1",
                displayVisibilityBySource: {
                  "": { isParentVisible: true, badgeText: "B1", visible: true, available: true },
                },
                isBaseNamespaceAvailable: false,
                isBaseTopicAvailable: true,
                namespaceItems: [],
                filterText: "1",
                datatype: "visualization_msgs/MarkerArray",
              },
            },
            {
              topicName: "/some_topic2",
              derivedFields: {
                id: "Some-Group_0_1",
                availablePrefixes: ["/webviz_bag_2"],
                isShownInList: false,
                dataSourceBadgeSlots: 2,
                displayName: "/some_topic2",
                displayVisibilityBySource: {
                  "/webviz_bag_2": { isParentVisible: true, badgeText: "B2", visible: true, available: true },
                },
                isBaseNamespaceAvailable: false,
                isBaseTopicAvailable: false,
                namespaceItems: [],
                filterText: "1",
                datatype: "visualization_msgs/MarkerArray",
              },
            },
            {
              topicName: "/some_topic3",
              derivedFields: {
                id: "Some-Group_0_2",
                availablePrefixes: [],
                isShownInList: true,
                dataSourceBadgeSlots: 2,
                displayName: "Display Name 31",
                displayVisibilityBySource: {},
                isBaseNamespaceAvailable: false,
                isBaseTopicAvailable: false,
                namespaceItems: [],
                filterText: "1",
              },
            },
            {
              topicName: "/some_topic4",
              displayName: "Display Name 4 1",
              derivedFields: {
                id: "Some-Group_0_3",
                availablePrefixes: [],
                isShownInList: true,
                dataSourceBadgeSlots: 2,
                displayName: "Display Name 4 1",
                displayVisibilityBySource: {},
                isBaseNamespaceAvailable: false,
                isBaseTopicAvailable: false,
                namespaceItems: [],
                filterText: "1",
              },
            },
          ],
        },
        {
          displayName: "Some Group1",
          expanded: false,
          derivedFields: {
            id: "Some-Group1_1",
            displayVisibilityBySourceByColumn: [
              { visible: false, visibilityBySource: { "": false, "/webviz_tables": false, "/webviz_labels": false } },
              { visible: false, visibilityBySource: { "/webviz_bag_2": false, "/webviz_tables_2": false } },
            ],
            isShownInList: true,
            filterText: "1",
          },
          items: [
            {
              topicName: "/some_topic2",
              derivedFields: {
                id: "Some-Group1_1_0",
                availablePrefixes: ["/webviz_bag_2"],
                isShownInList: false,
                dataSourceBadgeSlots: 2,
                displayName: "/some_topic2",
                displayVisibilityBySource: {
                  "/webviz_bag_2": { isParentVisible: false, badgeText: "B2", visible: true, available: true },
                },
                isBaseNamespaceAvailable: false,
                isBaseTopicAvailable: false,
                namespaceItems: [],
                filterText: "1",
                datatype: "visualization_msgs/MarkerArray",
              },
            },
          ],
        },
        {
          displayName: "Some Group2",
          expanded: false,
          derivedFields: {
            id: "Some-Group2_2",
            displayVisibilityBySourceByColumn: [
              { visible: false, visibilityBySource: { "": false, "/webviz_tables": false, "/webviz_labels": false } },
              { visible: false, visibilityBySource: { "/webviz_bag_2": false, "/webviz_tables_2": false } },
            ],
            isShownInList: false,
            filterText: "1",
          },
          items: [
            {
              topicName: "/some_topic2",
              derivedFields: {
                id: "Some-Group2_2_0",
                availablePrefixes: ["/webviz_bag_2"],
                isShownInList: false,
                dataSourceBadgeSlots: 2,
                displayName: "/some_topic2",
                displayVisibilityBySource: {
                  "/webviz_bag_2": { isParentVisible: false, badgeText: "B2", visible: true, available: true },
                },
                isBaseNamespaceAvailable: false,
                isBaseTopicAvailable: false,
                namespaceItems: [],
                filterText: "1",
                datatype: "visualization_msgs/MarkerArray",
              },
            },
          ],
        },
      ]);
    });

    it("filters out groups if none of the underlying topics matches", () => {
      const topicGroupConfig = [
        { displayName: "Some Group", items: [{ topicName: "/some_topic1" }] },
        { displayName: "Some Group2", items: [{ topicName: "/some_topic1" }, { topicName: "/some_topic2" }] },
      ];
      const filterText = "2";
      const filteredKeysSet = new Set(getFilteredKeys(topicGroupConfig, {}, filterText));

      expect(
        getTopicGroups(topicGroupConfig, {
          availableTopics: [
            { name: "/some_topic1", datatype: "visualization_msgs/MarkerArray" },
            { name: "/webviz_bag_2/some_topic2", datatype: "visualization_msgs/MarkerArray" },
          ],
          namespacesByTopic: {},
          displayNameByTopic: {},
          errorsByTopic: {},
          filterText,
          filteredKeysSet,
        })
      ).toEqual([
        {
          displayName: "Some Group",
          expanded: true,
          derivedFields: {
            id: "Some-Group_0",
            displayVisibilityBySourceByColumn: [
              { visible: true, visibilityBySource: { "": true, "/webviz_tables": true, "/webviz_labels": true } },
              { visible: true, visibilityBySource: { "/webviz_bag_2": true, "/webviz_tables_2": true } },
            ],
            isShownInList: false,
            filterText: "2",
          },
          items: [
            {
              topicName: "/some_topic1",
              derivedFields: {
                id: "Some-Group_0_0",
                availablePrefixes: [""],
                isShownInList: false,
                dataSourceBadgeSlots: 2,
                displayName: "/some_topic1",
                displayVisibilityBySource: {
                  "": { isParentVisible: true, badgeText: "B1", visible: true, available: true },
                },
                isBaseNamespaceAvailable: false,
                isBaseTopicAvailable: true,
                namespaceItems: [],
                filterText: "2",
                datatype: "visualization_msgs/MarkerArray",
              },
            },
          ],
        },
        {
          displayName: "Some Group2",
          expanded: false,
          derivedFields: {
            id: "Some-Group2_1",
            displayVisibilityBySourceByColumn: [
              { visible: false, visibilityBySource: { "": false, "/webviz_tables": false, "/webviz_labels": false } },
              { visible: false, visibilityBySource: { "/webviz_bag_2": false, "/webviz_tables_2": false } },
            ],
            isShownInList: true,
            filterText: "2",
          },
          items: [
            {
              topicName: "/some_topic1",
              derivedFields: {
                id: "Some-Group2_1_0",
                availablePrefixes: [""],
                isShownInList: false,
                dataSourceBadgeSlots: 2,
                displayName: "/some_topic1",
                displayVisibilityBySource: {
                  "": { isParentVisible: false, badgeText: "B1", visible: true, available: true },
                },
                isBaseNamespaceAvailable: false,
                isBaseTopicAvailable: true,
                namespaceItems: [],
                filterText: "2",
                datatype: "visualization_msgs/MarkerArray",
              },
            },
            {
              topicName: "/some_topic2",
              derivedFields: {
                id: "Some-Group2_1_1",
                availablePrefixes: ["/webviz_bag_2"],
                isShownInList: true,
                dataSourceBadgeSlots: 2,
                displayName: "/some_topic2",
                displayVisibilityBySource: {
                  "/webviz_bag_2": { isParentVisible: false, badgeText: "B2", visible: true, available: true },
                },
                isBaseNamespaceAvailable: false,
                isBaseTopicAvailable: false,
                namespaceItems: [],
                filterText: "2",
                datatype: "visualization_msgs/MarkerArray",
              },
            },
          ],
        },
      ]);
    });

    it("generates topic group config for multiple data sources (bags + tables + labels)", () => {
      expect(
        getTopicGroups(TOPIC_GROUPS_CONFIG, {
          availableTopics: AVAILABLE_TOPICS,
          namespacesByTopic: AVAILABLE_NAMESPACES,
          displayNameByTopic: {},
          errorsByTopic: {},
        })
      ).toMatchSnapshot();
    });
  });

  describe.skip("getNamespacesItemsBySource", () => {
    it("generates namespaces items with displayVisibilityBySource (hidden + available + badgeText)", () => {});
  });

  describe.skip("getSceneErrorsByTopic", () => {
    it("groups SceneBuilder errors by topic name", () => {});
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
            expanded: true,
            items: [
              // when missing visibilityBySource, select the non-prefixed topic as visible
              {
                topicName: "/topic_a",
              },
              {
                topicName: "/topic_b",
                visibilityBySource: { "/webviz_bag_2": false },
              },
              {
                topicName: "/topic_c",
                visibilityBySource: { "": true },
              },
              {
                topicName: "/topic_d",
                visibilityBySource: { "": false },
              },
              // omit topic if all data sources are not visible
              {
                topicName: "/topic_e",
                visibilityBySource: { "": false, "/webviz_bag_2": false },
              },
              {
                topicName: "/topic_f",
                visibilityBySource: { "": false, "/webviz_bag_2": true },
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
            visibilityBySource: {
              "": false,
              "/webviz_tables": false,
              "/webviz_labels": false,
              "/webviz_bag_2": false,
              "/webviz_tables_2": false,
            },
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

describe("transformTopicTree", () => {
  it("transforms the topic tree to the new tree format", () => {
    expect(transformTopicTree(DEFAULT_TOPIC_CONFIG)).toEqual({
      children: [
        { name: "Map", topicName: "/metadata" },
        { name: "Some Topic in JSON Tree", topicName: "/topic_in_json_tree" },
        { name: "TF", topicName: "/tf" },
        {
          children: [
            { name: "Topic A", topicName: "/topic_a" },
            { name: "Topic B", topicName: "/topic_b" },
            { children: [{ topicName: "/topic_c" }], name: "Deeply Nested Group" },
            { topicName: "/topic_d" },
          ],
          name: "Nested Group",
        },
      ],
      name: "root",
    });
  });
});
