// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import {
  toTopicTreeV2Nodes,
  fromTopicTreeV2Nodes,
  migrateLegacyIds,
  migrateToFeatureGroupCheckedKeys,
} from "./topicTreeV2Migrations";

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
              legacyIds: ["Some legacy name1"],
              children: [{ name: "Ext B", extension: "ExtB.b" }, { name: "Ext C", extension: "ExtC.c" }],
            },
            { name: "Some Topic in JSON Tree", topic: "/topic_in_json_tree" },
            { name: "TF", children: [], description: "Visualize relationships between /tf frames." },
            {
              name: "Nested Group",
              legacyIds: ["Some legacy name"],
              children: [
                { name: "Topic A", topic: "/topic_a", legacyIds: ["/topic_a_legacy"] },
                { name: "Topic B", topic: "/topic_b" },
                { name: "Deeply Nested Group", children: [{ topic: "/topic_c", legacyIds: ["/legacy_topic_c"] }] },
                { topic: "/topic_d" },
              ],
            },
          ],
        }),
        getDefaultTopicTreeV2: () => ({
          name: "root",
          children: [
            {
              name: "Map",
              topicName: "/metadata",
            },
            { name: "Some Topic in JSON Tree", topicName: "/topic_in_json_tree" },
            { name: "TF", children: [], description: "Visualize relationships between /tf frames." },
            {
              name: "Nested Group",
              children: [
                { name: "Topic A", topicName: "/topic_a" },
                { name: "Topic B", topicName: "/topic_b" },
                { name: "Deeply Nested Group", children: [{ topicName: "/topic_c" }] },
                { topicName: "/topic_d" },
              ],
            },
          ],
        }),
      },
    }),
  }),
}));

describe("topicTreeV2Migrations", () => {
  describe("toTopicTreeV2Nodes", () => {
    it(`adds 'name:' prefix`, () => {
      expect(toTopicTreeV2Nodes(["Some name", "another name"])).toEqual(["name:Some name", "name:another name"]);
    });
    it("converts extensions to namespaces", () => {
      expect(toTopicTreeV2Nodes(["x:TF.some_ns", "x:TF.", "x:ExB.b"])).toEqual([
        "ns:/tf:some_ns",
        "ns:/metadata:ExB.b",
      ]);
    });

    it("handles x:tiles", async () => {
      expect(toTopicTreeV2Nodes(["x:tiles"])).toEqual(["t:/metadata", "ns:/metadata:tiles"]);
    });
    it(`adds 't:' prefix`, () => {
      expect(toTopicTreeV2Nodes(["t:/topic_a", "/topic_b"])).toEqual(["t:/topic_a", "t:/topic_b"]);
    });
    it("handles legacy ids and remove duplicates", () => {
      expect(
        toTopicTreeV2Nodes([
          "name:Some legacy name",
          "/topic_a",
          "Nested Group",
          "Some legacy name1",
          "Ext A",
          "/topic_a_legacy",
        ])
      ).toEqual(["name:Nested Group", "t:/topic_a", "name:Ext A"]);
    });
  });

  describe("fromTopicTreeV2Nodes", () => {
    it("handles x:tiles", () => {
      expect(fromTopicTreeV2Nodes(["t:/metadata", "ns:/metadata:tiles"])).toEqual(["x:tiles"]);
      expect(fromTopicTreeV2Nodes(["ns:/metadata:tiles"])).toEqual([]);
      expect(fromTopicTreeV2Nodes(["t:/metadata"])).toEqual(["x:tiles"]);
    });

    it("converts TF and metadata nodes to extensions and removes duplicates", () => {
      expect(
        fromTopicTreeV2Nodes([
          "t:/metadata",
          "ns:/topic:ns",
          "t:/topic",
          "ns:/tf:some_ns",
          "ns:/metadata:ExB.b",
          "t:/tf",
          "t:/metadata",
          "ns:/metadata:tiles",
        ])
      ).toEqual(["x:tiles", "ns:/topic:ns", "t:/topic", "x:TF.some_ns", "x:ExB.b", "name:TF"]);
    });

    it("can convert back and forth", () => {
      const originalTopics = ["name:Map", "x:tiles", "ns:/topic:ns", "t:/topic", "x:TF.some_ns", "x:ExB.b", "name:TF"];
      expect(fromTopicTreeV2Nodes(toTopicTreeV2Nodes(originalTopics))).toEqual(originalTopics);
    });
  });

  describe("migrateLegacyIds", () => {
    it("migrates legacyIds for names and topics", () => {
      expect(
        migrateLegacyIds(["/topic_a_legacy", "name:Some legacy name1", "Some legacy name", "t:/legacy_topic_c"])
      ).toEqual(["t:/topic_a", "name:Ext A", "name:Nested Group", "t:/topic_c"]);
    });
  });

  describe("migrateToFeatureGroupCheckedKeys", () => {
    it("adds feature column group keys", () => {
      const checkedKeys = ["t:/foo", "t:/webviz_source_2/foo", "t:/webviz_source_2/topic_c"];
      //
      expect(migrateToFeatureGroupCheckedKeys(checkedKeys)).toEqual(checkedKeys);
      expect(migrateToFeatureGroupCheckedKeys([...checkedKeys, "name:(Uncategorized)"])).toEqual([
        ...checkedKeys,
        "name:(Uncategorized)",
        "name_2:(Uncategorized)",
        "name_2:Deeply Nested Group",
        "name_2:Nested Group",
      ]);
    });
  });
});
