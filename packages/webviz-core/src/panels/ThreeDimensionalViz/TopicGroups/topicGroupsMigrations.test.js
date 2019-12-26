// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { migratePanelConfigToTopicGroupConfig } from "./topicGroupsMigrations";

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
        displayName: "My Topics",
        expanded: true,
        items: [],
        selected: true,
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
            "x:some_extension_id",
            "x:TF.some_tf_id",
          ],
          topicSettings: {},
          modifiedNamespaceTopics: [],
        })
      ).toEqual({
        displayName: "My Topics",
        expanded: true,
        items: [
          {
            selectedNamespacesBySource: { "": ["some_extension_id"] },
            topicName: "/metadata",
          },
          { selectedNamespacesBySource: { "": ["some_tf_id"] }, topicName: "/tf" },
          { topicName: "/topic_a" },
          { topicName: "/topic_b" },
        ],
        selected: true,
      });
    });

    it("migrates panelConfig to topicGroupConfig (two bag)", () => {
      expect(
        migratePanelConfigToTopicGroupConfig({
          // bag2 topics
          checkedNodes: ["/webviz_bag_2/topic_b", "/webviz_bag_2/topic_c", "x:some_extension_id"],
          topicSettings: {},
          modifiedNamespaceTopics: [],
        })
      ).toEqual({
        displayName: "My Topics",
        expanded: true,
        items: [
          {
            selectedNamespacesBySource: { "": ["some_extension_id"] },
            topicName: "/metadata",
          },
          { topicName: "/topic_b", visibilitiesBySource: { "/webviz_bag_2": true } },
          { topicName: "/topic_c", visibilitiesBySource: { "/webviz_bag_2": true } },
        ],
        selected: true,
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
          ],
          topicSettings: {},
          modifiedNamespaceTopics: [],
        })
      ).toEqual({
        displayName: "My Topics",
        expanded: true,
        items: [
          { topicName: "/topic_a" },
          { topicName: "/topic_b", visibilitiesBySource: { "": true, "/webviz_bag_2": true } },
          { topicName: "/topic_c", visibilitiesBySource: { "/webviz_bag_2": true } },
        ],
        selected: true,
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
        displayName: "My Topics",
        expanded: true,
        items: [
          {
            settingsBySource: { "": { overrideColor: "255, 0, 0, 1" } },
            topicName: "/topic_a",
          },
          {
            settingsBySource: { "/webviz_bag_2": { overrideCommand: "LinedConvexHull" } },
            topicName: "/topic_b",
            visibilitiesBySource: { "": true, "/webviz_bag_2": true },
          },
          {
            settingsBySource: { "/webviz_bag_2": { overrideColor: "0, 255, 255, 0.1" } },
            topicName: "/topic_c",
            visibilitiesBySource: { "/webviz_bag_2": true },
          },
        ],
        selected: true,
      });
    });
    it("sets selectedNamespacesBySource based on modifiedNamespaceTopics and checkedNodes", () => {
      expect(
        migratePanelConfigToTopicGroupConfig({
          checkedNodes: ["/topic_a", "t:/topic_b", "t:/topic_d", "ns:/topic_d:some_ns1", "ns:/topic_d:some_ns2"],
          topicSettings: {},
          modifiedNamespaceTopics: ["/topic_a"],
        })
      ).toEqual({
        displayName: "My Topics",
        expanded: true,
        items: [
          { selectedNamespacesBySource: {}, topicName: "/topic_a" },
          { topicName: "/topic_b" },
          {
            selectedNamespacesBySource: { "": ["some_ns1", "some_ns2"] },
            topicName: "/topic_d",
          },
        ],
        selected: true,
      });
    });
  });
});
