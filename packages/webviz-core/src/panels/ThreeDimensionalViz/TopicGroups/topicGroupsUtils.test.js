// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { pick } from "lodash";

import { getFilteredKeys } from "./TopicGroups";
import {
  addIsKeyboardFocusedToTopicGroups,
  buildAvailableNamespacesByTopic,
  buildItemDisplayNameByTopicOrExtension,
  getBadgeTextByTopicName,
  getDefaultNewGroupItemConfig,
  getDefaultTopicItemConfig,
  getSelectionsFromTopicGroupConfig,
  getTopicGroups,
  removeBlankSpaces,
  removeTopicPrefixes,
  transformTopicTree,
  updateFocusIndexesAndGetFocusData,
  getTopLevelGroupsFromTopicTree,
  distributeImportedTopicsToTopLevelGroups,
  DEFAULT_METADATA_NAMESPACES,
  DEFAULT_GROUP_PREFIXES_BY_COLUMN,
} from "./topicGroupsUtils";
import type { TopicGroupConfig, TopicGroupType } from "./types";

const TOPIC_GROUPS_CONFIG: TopicGroupConfig[] = [
  {
    displayName: "My Topic Group",
    expanded: true,
    items: [
      {
        topicName: "/tf",
        expanded: true,
        selectedNamespacesByColumn: [["some_tf_ns1"], ["some_tf_ns1", "some_tf_ns2"]],
        visibilityByColumn: [true, false],
      },
      { topicName: "/metadata", displayName: "Map", visibilityByColumn: [true, false] },
      { topicName: "/some_topic_1", visibilityByColumn: [true, true] },
      { topicName: "/labels_json/some_label_topic_1" },
      {
        topicName: "/some_topic_2",
        expanded: true,
        visibilityByColumn: [false, true],
        selectedNamespacesByColumn: [["some_topic_2_ns1"], ["some_topic_2_ns1", "some_topic_2_ns2"]],
        settingsByColumn: [
          { overrideColor: "128, 0, 0, 1", overrideCommand: "LinedConvexHull" },
          { overrideColor: "0, 128, 0, 1", overrideCommand: "LinedConvexHull" },
        ],
      },
    ],
  },
  {
    displayName: "Some Topic Group 1",
    visibilityByColumn: [false, false],
    expanded: true,
    items: [
      { topicName: "/tf" },
      { topicName: "/some_topic_2", expanded: true },
      {
        topicName: "/tables/some_topic",
        visibilityByColumn: [true, true],
        settingsByColumn: [undefined, { overrideColor: "0, 0, 255, 0.5", overrideCommand: "LinedConvexHull" }],
      },
      {
        topicName: "/tables/some_topic_with_ns",
        expanded: true,
        visibilityByColumn: [true, true],
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
    name: "/labels_json/some_label_topic",
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
    { name: "TF", description: "Visualize relationships between /tf frames." },
    {
      name: "Nested Group",
      children: [
        { displayName: "Nested group a", name: "Topic A", topic: "/topic_a" },
        { name: "Topic B", topic: "/topic_b" },
        { name: "Deeply Nested Group", children: [{ displayName: "Deeply nested topic c", topic: "/topic_c" }] },
        { topic: "/topic_d" },
      ],
    },
  ],
};

jest.mock("webviz-core/src/loadWebviz", () => ({
  getGlobalHooks: () => ({
    perPanelHooks: () => ({
      ThreeDimensionalViz: {},
    }),
    startupPerPanelHooks: () => ({
      ThreeDimensionalViz: {
        getDefaultTopicSettingsByColumn: (topicName) => {
          if (topicName === "/topic_a") {
            return [{ colorOverride: "red" }, { colorOverride: "blue" }];
          }
          if (topicName === "/topic_b") {
            return [{ use3DModel: true }, { use3DModel: false }];
          }
          return undefined;
        },
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
    it("removes webviz feature topic prefixes", () => {
      expect(
        removeTopicPrefixes([
          "/foo/bar",
          "/webviz_bag_2/foo",
          "/webviz_tables_2/tables/some_table2_topic",
          "/webviz_tables/tables/some_table_topic",
          // Add another tables_2 topic to test that the order does not matter
          "/webviz_tables_2/another_table2_topic",
          "/labels_json/some_label_topic",
        ])
      ).toEqual([
        "/foo/bar",
        "/foo",
        "/tables/some_table2_topic",
        "/webviz_tables/tables/some_table_topic",
        "/another_table2_topic",
        "/labels_json/some_label_topic",
      ]);
    });
  });

  describe("buildItemDisplayNameByTopicOrExtension", () => {
    it("maps extension and topic to displayName", () => {
      expect(buildItemDisplayNameByTopicOrExtension(DEFAULT_TOPIC_CONFIG, true)).toEqual({
        "/metadata": "Map",
        "/tf": "TF",
        "/topic_a": "Nested group a",
        "/topic_b": "Nested Group / Topic B",
        "/topic_c": "Deeply nested topic c",
        "/topic_d": "Nested Group",
        "/topic_in_json_tree": "Some Topic in JSON Tree",
        "ExtA.a": "Ext A",
        "ExtB.b": "Ext A / Ext B",
        "ExtC.c": "Ext A / Ext C",
      });
    });
  });

  describe("getBadgeTextByTopicName", () => {
    it("gets the badges text by topic prefixes", () => {
      [
        { topicName: "/webviz_bag_2/foo", expected: "B2" },
        { topicName: "/tables/foo", expected: "T1" },
        { topicName: "/webviz_tables_2/tables/foo", expected: "T2" },
        { topicName: "/labels_json/foo", expected: "L1" },
        { topicName: "/labels_json_2/foo", expected: "L2" },
        { topicName: "/random_prefix/foo", expected: "B1" },
      ].forEach(({ topicName, expected }) => {
        expect(getBadgeTextByTopicName(topicName)).toEqual(expected);
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
          {
            availableTopics: [],
            namespacesByTopic: {},
            displayNameByTopic: {},
            errorsByTopic: {},
            hasFeatureColumn: false,
          }
        )
      ).toMatchSnapshot();
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
            hasFeatureColumn: true,
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
      ).toMatchSnapshot();
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
          hasFeatureColumn: true,
        })
      ).toMatchSnapshot();
    });
    it("returns filtered results based on topic group displayName, topicName, topic displayNames and namespace", () => {
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
        // filtered because namespace matches
        { displayName: "Some Group3", items: [{ topicName: "/some_topic3" }] },
      ];

      const displayNameByTopic = {
        "/some_topic3": "Display Name 31",
      };

      const filterText = "1";
      const namespacesByTopic = { "/some_topic3": ["ns1"] };
      const filteredKeysSet = new Set(
        getFilteredKeys(topicGroupConfig, displayNameByTopic, filterText, namespacesByTopic)
      );

      // helper function to extract the relevant fields to simplify expect result
      function getMappedData(topicGroups: TopicGroupType[]) {
        return topicGroups.map((group) => ({
          ...pick(group, ["displayName"]),
          derivedFields: pick(group.derivedFields, ["isShownInList", "filterText"]),
          items: group.items.map((item) => ({
            ...pick(item, ["topicName", "displayName"]),
            derivedFields: pick(item.derivedFields, ["isShownInList", "filterText"]),
          })),
        }));
      }

      const topicGroups = getTopicGroups(topicGroupConfig, {
        availableTopics: [
          { name: "/some_topic1", datatype: "visualization_msgs/MarkerArray" },
          { name: "/webviz_bag_2/some_topic2", datatype: "visualization_msgs/MarkerArray" },
        ],
        namespacesByTopic,
        displayNameByTopic,
        errorsByTopic: {},
        filterText,
        filteredKeysSet,
      });

      expect(getMappedData(topicGroups)).toEqual([
        {
          derivedFields: { filterText: "1", isShownInList: true },
          displayName: "Some Group",
          items: [
            { derivedFields: { filterText: "1", isShownInList: true }, topicName: "/some_topic1" },
            { derivedFields: { filterText: "1", isShownInList: false }, topicName: "/some_topic2" },
            { derivedFields: { filterText: "1", isShownInList: true }, topicName: "/some_topic3" },
            {
              derivedFields: { filterText: "1", isShownInList: true },
              displayName: "Display Name 4 1",
              topicName: "/some_topic4",
            },
          ],
        },
        {
          derivedFields: { filterText: "1", isShownInList: true },
          displayName: "Some Group1",
          items: [{ derivedFields: { filterText: "1", isShownInList: false }, topicName: "/some_topic2" }],
        },
        {
          derivedFields: { filterText: "1", isShownInList: false },
          displayName: "Some Group2",
          items: [{ derivedFields: { filterText: "1", isShownInList: false }, topicName: "/some_topic2" }],
        },
        {
          derivedFields: { filterText: "1", isShownInList: true },
          displayName: "Some Group3",
          items: [{ derivedFields: { filterText: "1", isShownInList: true }, topicName: "/some_topic3" }],
        },
      ]);
    });
    it("filters out groups if none of the underlying topics matches", () => {
      const topicGroupConfig = [
        { displayName: "Some Group", items: [{ topicName: "/some_topic1" }] },
        { displayName: "Some Group2", items: [{ topicName: "/some_topic1" }, { topicName: "/some_topic2" }] },
      ];
      const filterText = "2";
      const namespacesByTopic = {};
      const filteredKeysSet = new Set(getFilteredKeys(topicGroupConfig, {}, filterText, namespacesByTopic));

      expect(
        getTopicGroups(topicGroupConfig, {
          availableTopics: [
            { name: "/some_topic1", datatype: "visualization_msgs/MarkerArray" },
            { name: "/webviz_bag_2/some_topic2", datatype: "visualization_msgs/MarkerArray" },
          ],
          namespacesByTopic,
          displayNameByTopic: {},
          errorsByTopic: {},
          filterText,
          filteredKeysSet,
        }).map((group) => ({ displayName: group.displayName, isShownInList: group.derivedFields.isShownInList }))
      ).toEqual([
        { displayName: "Some Group", isShownInList: false },
        { displayName: "Some Group2", isShownInList: true },
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

  describe("getSelectionsFromTopicGroupConfig", () => {
    it("handles empty input", () => {
      expect(getSelectionsFromTopicGroupConfig([])).toEqual({
        selectedTopicNames: [],
        selectedNamespacesByTopic: {},
        selectedTopicSettingsByTopic: {},
      });
    });
    it("returns selectedTopicNames and selectedNamespacesByTopic", () => {
      const defaultGroupProp = { expanded: true, items: [] };
      const defaultVisibilityByColumn = [true, true];
      const defaultSettingsByColumn = [{ overrideColor: "128, 0, 0, 1" }, { overrideColor: "0, 128, 0, 1" }];

      expect(
        getSelectionsFromTopicGroupConfig([
          {
            ...defaultGroupProp,
            displayName: "Group 1 (when group visibility is not set)",
            items: [{ topicName: "/g1t1", visibilityByColumn: [true, false] }],
          },
          {
            ...defaultGroupProp,
            displayName: "Group 2 (when the group is visible)",
            visibilityByColumn: [true, true],
            items: [{ topicName: "/g2t1", visibilityByColumn: [true, false] }, { topicName: "/g2t2" }],
          },
          {
            ...defaultGroupProp,
            displayName: "Group (topic not visible when group is not visible",
            visibilityByColumn: [false, false],
            items: [{ topicName: "/g3t1", visibilityByColumn: [true, false] }],
          },
          {
            ...defaultGroupProp,
            displayName: "Group 4 (multiple data sources)",
            visibilityByColumn: [true, true],
            items: [
              { topicName: "/g4t1" },
              { topicName: "/g4t1", visibilityByColumn: [true, true] },
              { topicName: "/tables/g4t2", visibilityByColumn: [false, true] },
              { topicName: "/tables/g4t3", visibilityByColumn: [false, true] },
              { topicName: "/tables/g4t4", visibilityByColumn: [true, true] },
              { topicName: "/labels_json/g4t5", visibilityByColumn: [true, false] },
            ],
          },
          {
            ...defaultGroupProp,
            displayName: "Group 5 (namespaces)",
            visibilityByColumn: [true, true],
            items: [
              {
                topicName: "/g5t1",
                selectedNamespacesByColumn: [["ns1", "ns2"]],
              },
              {
                topicName: "/g5t2",
                visibilityByColumn: [true, false],
                selectedNamespacesByColumn: [["ns1", "ns2"]],
              },
              {
                topicName: "/g5t3",
                visibilityByColumn: [false, true],
                selectedNamespacesByColumn: [["ns1", "ns2"], ["ns3"]],
              },
              {
                topicName: "/g5t4",
                visibilityByColumn: [true, true],
                selectedNamespacesByColumn: [["ns1", "ns2"], ["ns3"]],
              },
            ],
          },
          {
            ...defaultGroupProp,
            displayName: "Group 6 (settings)",
            visibilityByColumn: [true, true],
            items: [
              {
                topicName: "/g6t1",
                settingsByColumn: [defaultSettingsByColumn[0], undefined],
              },
              {
                topicName: "/g6t2",
                visibilityByColumn: [true],
                settingsByColumn: [defaultSettingsByColumn[0], undefined],
              },
              {
                topicName: "/g6t3",
                visibilityByColumn: [true, false],
                settingsByColumn: defaultSettingsByColumn,
              },
              {
                topicName: "/g6t4",
                visibilityByColumn: [false, true],
                settingsByColumn: defaultSettingsByColumn,
              },
            ],
          },
          {
            ...defaultGroupProp,
            displayName: "Group 7 (mixed combinations)",
            visibilityByColumn: defaultVisibilityByColumn,
            items: [
              {
                topicName: "/tables/g7t1",
                visibilityByColumn: [true, true],
                settingsByColumn: [{ foo: 1 }, { bar: 2 }],
                selectedNamespacesByColumn: [["ns1", "ns2"], ["ns3"]],
              },
              {
                topicName: "/g7t2",
                visibilityByColumn: [false, true],
                settingsByColumn: [{ foo: 1 }, { bar: 2 }],
                selectedNamespacesByColumn: [["ns1", "ns2"], ["ns3"]],
              },
              {
                topicName: "/labels_json/g7t3",
                visibilityByColumn: [true, false],
                settingsByColumn: [{ foo: 1 }],
                selectedNamespacesByColumn: [["ns1", "ns2"], ["ns3"]],
              },
            ],
          },
        ])
      ).toEqual({
        selectedNamespacesByTopic: {
          "/g5t2": ["ns1", "ns2"],
          "/g5t4": ["ns1", "ns2"],
          "/tables/g7t1": ["ns1", "ns2"],
          "/webviz_bag_2/g5t3": ["ns3"],
          "/webviz_bag_2/g5t4": ["ns3"],
          "/webviz_bag_2/g7t2": ["ns3"],
          "/labels_json/g7t3": ["ns1", "ns2"],
          "/webviz_tables_2/tables/g7t1": ["ns3"],
        },
        selectedTopicNames: [
          "/g2t1",
          "/g4t1",
          "/webviz_bag_2/g4t1",
          "/webviz_tables_2/tables/g4t2",
          "/webviz_tables_2/tables/g4t3",
          "/tables/g4t4",
          "/webviz_tables_2/tables/g4t4",
          "/labels_json/g4t5",
          "/g5t2",
          "/webviz_bag_2/g5t3",
          "/g5t4",
          "/webviz_bag_2/g5t4",
          "/g6t2",
          "/g6t3",
          "/webviz_bag_2/g6t4",
          "/tables/g7t1",
          "/webviz_tables_2/tables/g7t1",
          "/webviz_bag_2/g7t2",
          "/labels_json/g7t3",
        ],
        selectedTopicSettingsByTopic: {
          "/g6t1": { overrideColor: "128, 0, 0, 1" },
          "/g6t2": { overrideColor: "128, 0, 0, 1" },
          "/g6t3": { overrideColor: "128, 0, 0, 1" },
          "/g6t4": { overrideColor: "128, 0, 0, 1" },
          "/g7t2": { foo: 1 },
          "/tables/g7t1": { foo: 1 },
          "/webviz_bag_2/g6t3": { overrideColor: "0, 128, 0, 1" },
          "/webviz_bag_2/g6t4": { overrideColor: "0, 128, 0, 1" },
          "/webviz_bag_2/g7t2": { bar: 2 },
          "/labels_json/g7t3": { foo: 1 },
          "/webviz_tables_2/tables/g7t1": { bar: 2 },
        },
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

  describe("updateFocusIndexesAndGetFocusData", () => {
    it("updates the focusIndexes and returns the focusData with objectPath and focusType", () => {
      // helper function to extract the relevant fields to simplify expect result
      function getMappedData(topicGroups: TopicGroupType[]) {
        return topicGroups.map((group) => ({
          ...pick(group, ["displayName"]),
          derivedFields: pick(group.derivedFields, ["addTopicKeyboardFocusIndex", "keyboardFocusIndex"]),
          items: group.items.map((item) => ({
            ...pick(item, ["topicName"]),
            derivedFields: pick(item.derivedFields, ["keyboardFocusIndex"]),
          })),
        }));
      }

      const result = updateFocusIndexesAndGetFocusData([
        {
          derivedFields: {
            addTopicKeyboardFocusIndex: -1,
            expanded: true,
            id: "Some-Group_0",
            isShownInList: true,
            keyboardFocusIndex: -1,
            prefixesByColumn: DEFAULT_GROUP_PREFIXES_BY_COLUMN,
            hasFeatureColumn: true,
          },
          displayName: "Some Group",
          items: [
            {
              derivedFields: {
                prefixByColumn: ["", "/webviz_bag_2"],
                datatype: "visualization_msgs/MarkerArray",
                displayName: "/some_topic1",
                displayVisibilityByColumn: [
                  { available: true, badgeText: "B1", isParentVisible: true, visible: true },
                  { available: true, badgeText: "B2", isParentVisible: true, visible: true },
                ],
                sortedNamespaceDisplayVisibilityByColumn: [],
                id: "Some-Group_0_0",
                isShownInList: true,
                keyboardFocusIndex: -1,
              },
              topicName: "/some_topic1",
            },
          ],
        },
      ]);

      expect(result.focusData).toEqual([
        { focusType: "GROUP", objectPath: "[0]" },
        { focusType: "TOPIC", objectPath: "[0].items.[0]" },
        { focusType: "NEW_TOPIC", objectPath: "[0].items" },
        { focusType: "NEW_GROUP", objectPath: "" },
      ]);
      expect(getMappedData(result.topicGroups)).toEqual([
        {
          derivedFields: { addTopicKeyboardFocusIndex: 2, keyboardFocusIndex: 0 },
          displayName: "Some Group",
          items: [{ derivedFields: { keyboardFocusIndex: 1 }, topicName: "/some_topic1" }],
        },
      ]);
    });
  });

  describe("addIsKeyboardFocusedToTopicGroups", () => {
    const topicGroupsData = [
      {
        derivedFields: {
          addTopicKeyboardFocusIndex: 2,
          expanded: true,
          id: "Some-Group_0",
          isShownInList: true,
          keyboardFocusIndex: 0,
          prefixesByColumn: DEFAULT_GROUP_PREFIXES_BY_COLUMN,
          hasFeatureColumn: true,
        },
        displayName: "Some Group",
        items: [
          {
            derivedFields: {
              prefixByColumn: ["", "/webviz_bag_2"],
              datatype: "visualization_msgs/MarkerArray",
              displayName: "/some_topic1",
              displayVisibilityByColumn: [
                { available: true, badgeText: "B1", isParentVisible: true, visible: true },
                { available: true, badgeText: "B2", isParentVisible: true, visible: true },
              ],
              id: "Some-Group_0_0",
              isShownInList: true,
              keyboardFocusIndex: 1,
              sortedNamespaceDisplayVisibilityByColumn: [],
            },
            topicName: "/some_topic1",
          },
        ],
      },
    ];

    // helper function to extract the relevant fields
    function getMappedData(topicGroups: TopicGroupType[]) {
      return topicGroups.map((group) => ({
        ...pick(group, ["displayName"]),
        derivedFields: pick(group.derivedFields, ["isKeyboardFocused"]),
        items: group.items.map((item) => ({
          ...pick(item, ["topicName"]),
          derivedFields: pick(item.derivedFields, ["isKeyboardFocused"]),
        })),
      }));
    }

    it("add isKeyboardFocused to focused group", () => {
      expect(getMappedData(addIsKeyboardFocusedToTopicGroups(topicGroupsData, 0))).toEqual([
        {
          displayName: "Some Group",
          derivedFields: { isKeyboardFocused: true },
          items: [{ derivedFields: { isKeyboardFocused: undefined }, topicName: "/some_topic1" }],
        },
      ]);
    });
    it("add isKeyboardFocused to focused topic", () => {
      expect(getMappedData(addIsKeyboardFocusedToTopicGroups(topicGroupsData, 1))).toEqual([
        {
          displayName: "Some Group",
          derivedFields: { isKeyboardFocused: undefined },
          items: [{ derivedFields: { isKeyboardFocused: true }, topicName: "/some_topic1" }],
        },
      ]);
    });
  });

  describe("default config", () => {
    describe("getDefaultTopicItemConfig", () => {
      it("returns default topicItemConfig for base topics", () => {
        let topicName = "/foo";
        expect(getDefaultTopicItemConfig(topicName)).toEqual({ topicName, visibilityByColumn: [true, false] });
        topicName = "/webviz_tables/foo";
        expect(getDefaultTopicItemConfig(topicName)).toEqual({ topicName, visibilityByColumn: [true, false] });
        topicName = "/labels_json/foo";
        expect(getDefaultTopicItemConfig(topicName)).toEqual({
          topicName: "/labels_json/foo",
          visibilityByColumn: [true, false],
        });
      });

      it("returns default topicItemConfig for feature topics", () => {
        let topicName = "/webviz_bag_2/foo";
        expect(getDefaultTopicItemConfig(topicName)).toEqual({ topicName: "/foo", visibilityByColumn: [true, false] });
        topicName = "/webviz_tables_2/tables/foo";
        expect(getDefaultTopicItemConfig(topicName)).toEqual({
          topicName: "/tables/foo",
          visibilityByColumn: [true, false],
        });
      });

      it("returns default topicItemConfig with default topic settings", () => {
        let topicName = "/webviz_bag_2/topic_a";
        expect(getDefaultTopicItemConfig(topicName)).toEqual({
          settingsByColumn: [{ colorOverride: "red" }, { colorOverride: "blue" }],
          topicName: "/topic_a",
          visibilityByColumn: [true, false],
        });
        topicName = "/topic_b";

        expect(getDefaultTopicItemConfig(topicName)).toEqual({
          settingsByColumn: [{ use3DModel: true }, { use3DModel: false }],
          topicName: "/topic_b",
          visibilityByColumn: [true, false],
        });
      });

      it("sets the selectedNamespacesByColumn for '/metadata' topic", () => {
        const topicName = "/metadata";
        expect(getDefaultTopicItemConfig(topicName)).toEqual({
          topicName,
          selectedNamespacesByColumn: [DEFAULT_METADATA_NAMESPACES, []],
          visibilityByColumn: [true, false],
        });
      });
      it("uses defaultMetadataNamespaces to overwrite default metadata namespaces", () => {
        const topicName = "/metadata";
        const customDefaultNamespaces = ["foo", "bar"];
        expect(getDefaultTopicItemConfig(topicName, customDefaultNamespaces)).toEqual({
          topicName,
          selectedNamespacesByColumn: [customDefaultNamespaces, []],
          visibilityByColumn: [true, false],
        });
      });
    });

    describe("getDefaultNewGroupItemConfig", () => {
      it("returns default config for both group and topics", () => {
        expect(
          getDefaultNewGroupItemConfig("My Group", [
            "/foo",
            "/webviz_bag_2/foo1",
            "/webviz_tables/bar",
            "/webviz_tables_2/bar1",
            "/webviz_tables_2/foo1",
            "/webviz_tables/foo2",
            "/webviz_bag_2/topic_b",
            "/topic_a",
          ])
        ).toEqual({
          displayName: "My Group",
          expanded: true,
          items: [
            { topicName: "/foo", visibilityByColumn: [true, false] },
            { topicName: "/foo1", visibilityByColumn: [true, false] },
            { topicName: "/webviz_tables/bar", visibilityByColumn: [true, false] },
            { topicName: "/bar1", visibilityByColumn: [true, false] },
            { topicName: "/foo1", visibilityByColumn: [true, false] },
            { topicName: "/webviz_tables/foo2", visibilityByColumn: [true, false] },
            {
              settingsByColumn: [{ use3DModel: true }, { use3DModel: false }],
              topicName: "/topic_b",
              visibilityByColumn: [true, false],
            },
            {
              settingsByColumn: [{ colorOverride: "red" }, { colorOverride: "blue" }],
              topicName: "/topic_a",
              visibilityByColumn: [true, false],
            },
          ],
          visibilityByColumn: [true, true],
        });
      });
    });
  });

  describe("removeBlankSpaces", () => {
    it("removes blank spaces", () => {
      expect(removeBlankSpaces("      ")).toEqual("");
      expect(removeBlankSpaces("/ ")).toEqual("/");
      expect(removeBlankSpaces("/ab f")).toEqual("/abf");
      expect(removeBlankSpaces("    /ab f")).toEqual("/abf");
    });
  });

  describe("getTopLevelGroupsFromTopicTree", () => {
    it("generates the top level groups from topic tree config", () => {
      expect(getTopLevelGroupsFromTopicTree(DEFAULT_TOPIC_CONFIG)).toEqual([
        {
          displayName: "Ext A",
          expanded: false,
          items: [
            {
              selectedNamespacesByColumn: [["ExtB.b", "ExtC.c"], []],
              topicName: "/metadata",
              visibilityByColumn: [true, false],
            },
          ],
        },
        {
          displayName: "Some Topic in JSON Tree",
          expanded: false,
          items: [{ topicName: "/topic_in_json_tree", visibilityByColumn: [true, false] }],
        },
        { displayName: "TF", expanded: false, items: [{ topicName: "/tf", visibilityByColumn: [true, false] }] },
        {
          displayName: "Nested Group",
          expanded: false,
          items: [
            {
              settingsByColumn: [{ colorOverride: "red" }, { colorOverride: "blue" }],
              topicName: "/topic_a",
              visibilityByColumn: [true, false],
            },
            {
              settingsByColumn: [{ use3DModel: true }, { use3DModel: false }],
              topicName: "/topic_b",
              visibilityByColumn: [true, false],
            },
            { topicName: "/topic_c", visibilityByColumn: [true, false] },
            { topicName: "/topic_d", visibilityByColumn: [true, false] },
          ],
        },
      ]);
    });
    it("generates a default group if the topic tree has a topic but does not have children", () => {
      expect(getTopLevelGroupsFromTopicTree({ topic: "/foo" })).toEqual([
        {
          displayName: "Default Group",
          expanded: true,
          items: [{ topicName: "/foo", visibilityByColumn: [true, false] }],
          visibilityByColumn: [true, true],
        },
      ]);
    });
    it("does not generate a group if the topic tree does not have topic or children", () => {
      expect(getTopLevelGroupsFromTopicTree({ name: "foo" })).toEqual([]);
    });
  });

  describe("distributeImportedTopicsToTopLevelGroups", () => {
    it("returns multiple topic groups with topics distributed into top level groups derived from the topic tree", () => {
      expect(
        distributeImportedTopicsToTopLevelGroups({
          displayName: "My Group",
          expanded: true,
          visibilityByColumn: [true, false],
          items: [
            { topicName: "/metadata" },
            { topicName: "/tf", selectedNamespacesByColumn: [["ns1", "ns2"]] },
            { topicName: "/topic_a", visibilityByColumn: [true, false] },
            { topicName: "/topic_b" },
          ],
        })
      ).toEqual([
        { displayName: "Ext A", expanded: true, visibilityByColumn: [true, true], items: [{ topicName: "/metadata" }] },
        {
          displayName: "TF",
          expanded: true,
          visibilityByColumn: [true, true],
          items: [{ selectedNamespacesByColumn: [["ns1", "ns2"]], topicName: "/tf" }],
        },
        {
          displayName: "Nested Group",
          expanded: true,
          visibilityByColumn: [true, true],
          items: [{ topicName: "/topic_a", visibilityByColumn: [true, false] }, { topicName: "/topic_b" }],
        },
      ]);
    });
    it("returns the original group if there are no topics in the input topic group", () => {
      const inputGroup = {
        displayName: "My Group",
        expanded: true,
        visibilityByColumn: [true, false],
        items: [],
      };
      expect(distributeImportedTopicsToTopLevelGroups(inputGroup)).toEqual([inputGroup]);
    });

    it("adds uncategorized group if input topic group contains topics outside of the topic tree", () => {
      expect(
        distributeImportedTopicsToTopLevelGroups({
          displayName: "My Group",
          expanded: true,
          visibilityByColumn: [true, false],
          items: [{ topicName: "/some_topic_not_in_topic_tree" }, { topicName: "/topic_b" }],
        })
      ).toEqual([
        {
          displayName: "Nested Group",
          expanded: true,
          visibilityByColumn: [true, true],
          items: [{ topicName: "/topic_b" }],
        },
        {
          displayName: "Uncategorized",
          expanded: true,
          items: [{ topicName: "/some_topic_not_in_topic_tree", visibilityByColumn: [true, false] }],
          visibilityByColumn: [true, true],
        },
      ]);
    });
  });
});
