// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import {
  migratePanelConfigToTopicGroupConfig,
  migrateLegacyIds,
  migrateTopicGroupFromBySourceToByColumn,
} from "./topicGroupsMigrations";

jest.mock("webviz-core/src/loadWebviz", () => ({
  getGlobalHooks: () => ({
    startupPerPanelHooks: () => ({
      ThreeDimensionalViz: {
        getDefaultTopicTree: () => ({
          name: "root",
          children: [
            {
              name: "Ext A",
              extension: "some_extension_a",
              children: [
                {
                  name: "Ext B",
                  extension: "some_extension_b",
                },
                {
                  name: "Ext C",
                  extension: "some_extension_c",
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
              legacyIds: ["Legacy Group2"],
              description: "Visualize relationships between /tf frames.",
            },
            {
              name: "Nested Group",
              legacyIds: ["Legacy Group1"],
              children: [
                {
                  name: "Topic A",
                  topic: "/topic_a",
                  legacyIds: ["/legacy_topic_a", "/another_legacy_topic_a"],
                },
                {
                  name: "Topic B",
                  topic: "/topic_b",
                },
                {
                  name: "Deeply Nested Group",
                  children: [{ topic: "/topic_c", legacyIds: ["/legacy_topic_c"] }],
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

describe("topicGroupsMigrations", () => {
  describe("migratePanelConfigToTopicGroupConfig", () => {
    it("migrates empty panelConfig", () => {
      expect(
        migratePanelConfigToTopicGroupConfig({
          checkedNodes: [],
          topicSettings: {},
          modifiedNamespaceTopics: [],
        })
      ).toEqual({
        displayName: "Imported Group",
        expanded: true,
        items: [],
        visibilityByColumn: [true, true],
      });
    });
    it("can specify topic group displayName", () => {
      expect(
        migratePanelConfigToTopicGroupConfig({
          checkedNodes: [],
          topicSettings: {},
          modifiedNamespaceTopics: [],
          topicGroupDisplayName: "My Topics",
        })
      ).toEqual({
        displayName: "My Topics",
        expanded: true,
        items: [],
        visibilityByColumn: [true, true],
      });
    });
    it("migrates panelConfig to topicGroupConfig (single bag)", () => {
      expect(
        migratePanelConfigToTopicGroupConfig({
          checkedNodes: [
            "/topic_a",
            "t:/topic_b",
            "ns:/topic_d:some_ns1",
            "ns:/topic_d:some_ns2",
            "x:some_extension_a",
            "x:TF.some_tf_id",
            "name:Nested Group",
          ],
          topicSettings: {},
          modifiedNamespaceTopics: [],
        })
      ).toEqual({
        displayName: "Imported Group",
        expanded: true,
        items: [
          {
            selectedNamespacesByColumn: [["some_extension_a"], []],
            topicName: "/metadata",
            visibilityByColumn: [true, false],
          },
          {
            selectedNamespacesByColumn: [["some_tf_id"], []],
            topicName: "/tf",
            visibilityByColumn: [true, false],
          },
          { topicName: "/topic_a", visibilityByColumn: [true, false] },
          { topicName: "/topic_b", visibilityByColumn: [true, false] },
        ],
        visibilityByColumn: [true, true],
      });
    });

    it("migrates panelConfig to topicGroupConfig (two bags)", () => {
      expect(
        migratePanelConfigToTopicGroupConfig({
          // bag2 topics
          checkedNodes: [
            "/webviz_bag_2/topic_b",
            "/webviz_bag_2/topic_c",
            "x:some_extension_a",
            "name:Nested Group",
            "name:(Uncategorized)",
          ],
          topicSettings: {},
          modifiedNamespaceTopics: [],
        })
      ).toEqual({
        displayName: "Imported Group",
        expanded: true,
        items: [
          {
            selectedNamespacesByColumn: [["some_extension_a"], []],
            topicName: "/metadata",
            visibilityByColumn: [true, false],
          },
          { topicName: "/topic_b", visibilityByColumn: [false, true] },
          { topicName: "/topic_c", visibilityByColumn: [false, true] },
        ],
        visibilityByColumn: [true, true],
      });

      expect(
        migratePanelConfigToTopicGroupConfig({
          // mixed topics from bag1 and bag2
          checkedNodes: [
            "/topic_a",
            "t:/topic_b",
            "/webviz_bag_2/topic_b",
            "t:/webviz_bag_2/topic_c",
            "ns:/topic_d:some_ns1",
            "ns:/topic_d:some_ns2",
            "name:Nested Group",
          ],
          topicSettings: {},
          modifiedNamespaceTopics: [],
        })
      ).toEqual({
        displayName: "Imported Group",
        expanded: true,
        items: [
          { topicName: "/topic_a", visibilityByColumn: [true, false] },
          { topicName: "/topic_b", visibilityByColumn: [true, false] },
        ],
        visibilityByColumn: [true, true],
      });
    });
    it("migrates panelConfig to topicGroupConfig (with topicSettings)", () => {
      expect(
        migratePanelConfigToTopicGroupConfig({
          checkedNodes: [
            "/topic_a",
            "t:/topic_b",
            "/webviz_bag_2/topic_b",
            "t:/webviz_bag_2/topic_c",
            "ns:/topic_d:some_ns1",
            "ns:/topic_d:some_ns2",
            "name:Nested Group",
            "name:(Uncategorized)",
          ],
          topicSettings: {
            "/topic_a": { overrideColor: "255, 0, 0, 1" },
            "/webviz_bag_2/topic_b": { overrideCommand: "LinedConvexHull" },
            "/topic_c": { overrideColor: "0, 255, 0, 1" },
            "/webviz_bag_2/topic_c": { overrideColor: "0, 255, 255, 0.1" },
          },
          modifiedNamespaceTopics: [],
        })
      ).toEqual({
        displayName: "Imported Group",
        expanded: true,
        items: [
          {
            settingsByColumn: [{ overrideColor: "255, 0, 0, 1" }, undefined],
            topicName: "/topic_a",
            visibilityByColumn: [true, false],
          },
          {
            settingsByColumn: [undefined, { overrideCommand: "LinedConvexHull" }],
            topicName: "/topic_b",
            visibilityByColumn: [true, true],
          },
          {
            settingsByColumn: [undefined, { overrideColor: "0, 255, 255, 0.1" }],
            topicName: "/topic_c",
            visibilityByColumn: [false, true],
          },
        ],
        visibilityByColumn: [true, true],
      });
    });
    it("sets selectedNamespacesByColumn based on modifiedNamespaceTopics and checkedNodes", () => {
      expect(
        migratePanelConfigToTopicGroupConfig({
          checkedNodes: [
            "/topic_a",
            "t:/topic_b",
            "t:/topic_d",
            "ns:/topic_d:some_ns1",
            "ns:/topic_d:some_ns2",
            "name:Nested Group",
            "name:(Uncategorized)",
          ],
          topicSettings: {},
          modifiedNamespaceTopics: ["/topic_a"],
        })
      ).toEqual({
        displayName: "Imported Group",
        expanded: true,
        items: [
          {
            selectedNamespacesByColumn: [undefined, undefined],
            topicName: "/topic_a",
            visibilityByColumn: [true, false],
          },
          { topicName: "/topic_b", visibilityByColumn: [true, false] },
          {
            selectedNamespacesByColumn: [["some_ns1", "some_ns2"], undefined],
            topicName: "/topic_d",
            expanded: true,
            visibilityByColumn: [true, false],
          },
        ],
        visibilityByColumn: [true, true],
      });
    });

    it("auto expands topics if any namespaces under the topic is selected (excluding /tf and /metadata)", () => {
      expect(
        migratePanelConfigToTopicGroupConfig({
          checkedNodes: [
            "t:/topic_d",
            "ns:/topic_d:some_ns1",
            "ns:/topic_d:some_ns2",
            "x:/some_extension_a",
            "x:TF.some_tf_ns1",
            "name:TF",
            "Nested Group",
            "name:(Uncategorized)",
          ],
          topicSettings: {},
          modifiedNamespaceTopics: ["/topic_a"],
        })
      ).toEqual({
        displayName: "Imported Group",
        expanded: true,
        items: [
          {
            selectedNamespacesByColumn: [["/some_extension_a"], []],
            topicName: "/metadata",
            visibilityByColumn: [true, false],
          },
          {
            selectedNamespacesByColumn: [["some_tf_ns1"], []],
            topicName: "/tf",
            visibilityByColumn: [true, false],
          },
          {
            expanded: true,
            selectedNamespacesByColumn: [["some_ns1", "some_ns2"], undefined],
            topicName: "/topic_d",
            visibilityByColumn: [true, false],
          },
        ],
        visibilityByColumn: [true, true],
      });
    });

    it("only selects a topic if parent names are selected", () => {
      expect(
        migratePanelConfigToTopicGroupConfig({
          checkedNodes: ["/topic_a"],
          topicSettings: {},
          modifiedNamespaceTopics: [],
        })
      ).toEqual({ displayName: "Imported Group", expanded: true, visibilityByColumn: [true, true], items: [] });

      expect(
        migratePanelConfigToTopicGroupConfig({
          checkedNodes: ["/topic_a", "name:(Uncategorized)"],
          topicSettings: {},
          modifiedNamespaceTopics: [],
        })
      ).toEqual({ displayName: "Imported Group", expanded: true, visibilityByColumn: [true, true], items: [] });

      expect(
        migratePanelConfigToTopicGroupConfig({
          checkedNodes: ["/topic_a", "name:Nested Group"],
          topicSettings: {},
          modifiedNamespaceTopics: [],
        })
      ).toEqual({
        displayName: "Imported Group",
        expanded: true,
        visibilityByColumn: [true, true],
        items: [{ topicName: "/topic_a", visibilityByColumn: [true, false] }],
      });
      expect(
        migratePanelConfigToTopicGroupConfig({
          checkedNodes: ["/webviz_bag_2/topic_a", "name:Nested Group"],
          topicSettings: {},
          modifiedNamespaceTopics: [],
        })
      ).toEqual({ displayName: "Imported Group", expanded: true, visibilityByColumn: [true, true], items: [] });

      expect(
        migratePanelConfigToTopicGroupConfig({
          checkedNodes: ["/webviz_bag_2/topic_a", "name:(Uncategorized)"],
          topicSettings: {},
          modifiedNamespaceTopics: [],
        })
      ).toEqual({
        displayName: "Imported Group",
        expanded: true,
        visibilityByColumn: [true, true],
        items: [{ topicName: "/topic_a", visibilityByColumn: [false, true] }],
      });
    });
  });

  describe("migrateLegacyIds", () => {
    it("migrates legacyIds for names and topics", () => {
      expect(migrateLegacyIds(["/legacy_topic_a", "name:Legacy Group1", "Legacy Group2", "t:/legacy_topic_c"])).toEqual(
        ["t:/topic_a", "name:Nested Group", "name:TF", "t:/topic_c"]
      );
    });
  });

  describe("migrateTopicGroupFromBySourceToByColumn", () => {
    it("migrateTopicGroupFromBySourceToByColumn", () => {
      expect(
        migrateTopicGroupFromBySourceToByColumn([
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
              { topicName: "/labels_json/some_label_topic_1" },
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
        ])
      ).toEqual([
        {
          displayName: "My Topic Group",
          expanded: true,
          items: [
            {
              expanded: true,
              selectedNamespacesByColumn: [["some_tf_ns1"], ["some_tf_ns1", "some_tf_ns2"]],
              topicName: "/tf",
              visibilityByColumn: [true, false],
            },
            {
              displayName: "Map",
              topicName: "/metadata",
              visibilityByColumn: [true, false],
            },
            {
              topicName: "/some_topic_1",
              visibilityByColumn: [true, true],
            },
            {
              topicName: "/labels_json/some_label_topic_1",
              visibilityByColumn: [true, false],
            },
            {
              expanded: true,
              selectedNamespacesByColumn: [["some_topic_2_ns1"], ["some_topic_2_ns1", "some_topic_2_ns2"]],
              settingsByColumn: [
                { overrideColor: "128, 0, 0, 1", overrideCommand: "LinedConvexHull" },
                { overrideColor: "0, 128, 0, 1", overrideCommand: "LinedConvexHull" },
              ],
              topicName: "/some_topic_2",
              visibilityByColumn: [false, true],
            },
          ],
          visibilityByColumn: [true, true],
        },
      ]);
    });
  });
});
