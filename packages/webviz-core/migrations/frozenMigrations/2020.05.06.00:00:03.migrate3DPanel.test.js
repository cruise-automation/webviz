// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import {
  toTopicTreeNodes,
  migrateLegacyIds,
} from "webviz-core/migrations/frozenMigrations/2020.05.06.00:00:03.migrate3DPanel";

const topicTreeConfig = {
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
      legacyIds: ["Some legacy name"],
      children: [
        { name: "Topic A", topicName: "/topic_a", legacyIds: ["/topic_a_legacy"] },
        { name: "Topic B", topicName: "/topic_b" },
        { name: "Deeply Nested Group", children: [{ topicName: "/topic_c", legacyIds: ["/legacy_topic_c"] }] },
        { topicName: "/topic_d" },
      ],
    },
  ],
};

describe("toTopicTreeNodes", () => {
  it(`adds 'name:' prefix`, () => {
    expect(toTopicTreeNodes(["Some name", "another name"], topicTreeConfig)).toEqual([
      "name:Some name",
      "name:another name",
    ]);
  });
  it("converts extensions to namespaces", () => {
    expect(toTopicTreeNodes(["x:TF.some_ns", "x:TF.", "x:ExB.b"], topicTreeConfig)).toEqual([
      "ns:/tf:some_ns",
      "ns:/metadata:ExB.b",
    ]);
  });

  it("handles x:tiles", () => {
    expect(toTopicTreeNodes(["x:tiles"], topicTreeConfig)).toEqual(["t:/metadata", "ns:/metadata:tiles"]);
  });
  it(`adds 't:' prefix`, () => {
    expect(toTopicTreeNodes(["t:/topic_a", "/topic_b"], topicTreeConfig)).toEqual(["t:/topic_a", "t:/topic_b"]);
  });
  it("handles legacy ids and remove duplicates", () => {
    expect(
      toTopicTreeNodes(
        ["name:Some legacy name", "/topic_a", "Nested Group", "Ext A", "/topic_a_legacy"],
        topicTreeConfig
      )
    ).toEqual(["name:Nested Group", "t:/topic_a", "name:Ext A"]);
  });
});

describe("migrateLegacyIds", () => {
  it("migrates legacyIds for names and topics", () => {
    expect(migrateLegacyIds(["/topic_a_legacy", "Some legacy name", "t:/legacy_topic_c"], topicTreeConfig)).toEqual([
      "t:/topic_a",
      "name:Nested Group",
      "t:/topic_c",
    ]);
  });
});
