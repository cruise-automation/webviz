// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import migrateCheckedKeys, { makePredecessorRelations, visibleTopicKeys } from "./migrate3dPanelCheckedKeys";

describe("makePredecessorRelations", () => {
  it("Makes simple relations", () => {
    const relations = makePredecessorRelations({
      name: "root",
      children: [
        {
          name: "Foo Name",
          children: [
            { name: "Foo Topic 1", topicName: "/foo_topic_1" },
            { name: "Foo Topic 2", topicName: "/foo_topic_2" },
          ],
        },
        {
          name: "Bar Name",
          children: [
            {
              name: "Baz Name",
              children: [{ name: "Baz Topic", topicName: "/baz_topic" }],
            },
          ],
        },
      ],
    });
    expect([...relations].sort()).toEqual([
      ["name:Bar Name", "name:root"],
      ["name:Baz Name", "name:Bar Name"],
      ["name:Foo Name", "name:root"],
      ["name_2:Bar Name", "name_2:root"],
      ["name_2:Baz Name", "name_2:Bar Name"],
      ["name_2:Foo Name", "name_2:root"],
      ["t:/baz_topic", "name:Baz Name"],
      ["t:/foo_topic_1", "name:Foo Name"],
      ["t:/foo_topic_2", "name:Foo Name"],
      ["t:/webviz_source_2/baz_topic", "name_2:Baz Name"],
      ["t:/webviz_source_2/foo_topic_1", "name_2:Foo Name"],
      ["t:/webviz_source_2/foo_topic_2", "name_2:Foo Name"],
    ]);
  });

  it("rejects relations with duplicated names (that it can't handle)", () => {
    const tree = {
      name: "root",
      children: [
        {
          name: "Foo Name",
          children: [{ name: "Foo Topic", topicName: "/foo_topic" }],
        },
        {
          name: "Foo Name",
          children: [{ name: "Baz Topic", topicName: "/baz_topic" }],
        },
      ],
    };
    expect(() => makePredecessorRelations(tree)).toThrow("Duplicate key");
  });
});

// Jest isn't great with sets, so make it a sorted array.
const getVisibleTopicKeys = (predecessors, checkedKeys) => [...visibleTopicKeys(predecessors, checkedKeys)].sort();

describe("visibleTopicKeys", () => {
  it("handles visible nested topics", () => {
    const predecessors = new Map([["name:Foo", "name:root"], ["name:Bar", "name:Foo"], ["t:/baz", "name:Bar"]]);
    const checkedKeys = new Set(["name:Foo", "name:Bar", "t:/baz"]);
    expect(getVisibleTopicKeys(predecessors, checkedKeys)).toEqual(["t:/baz"]);
  });

  it("handles disabled topics with enabled ancestors", () => {
    const predecessors = new Map([["name:Foo", "name:root"], ["name:Bar", "name:Foo"], ["t:/baz", "name:Bar"]]);
    const checkedKeys = new Set(["name:Foo", "name:Bar"]);
    expect(getVisibleTopicKeys(predecessors, checkedKeys)).toEqual([]);
  });

  it("handles enabled topics with disabled ancestors", () => {
    const predecessors = new Map([["name:Foo", "name:root"], ["name:Bar", "name:Foo"], ["t:/baz", "name:Bar"]]);
    const checkedKeys = new Set(["name:Foo", "t:/baz"]);
    expect(getVisibleTopicKeys(predecessors, checkedKeys)).toEqual([]);
  });

  it("handles visible uncategorized topics", () => {
    const predecessors = new Map([]);
    const checkedKeys = new Set(["name:(Uncategorized)", "t:/foo"]);
    expect(getVisibleTopicKeys(predecessors, checkedKeys)).toEqual(["t:/foo"]);
  });

  it("handles enabled uncategorized topics with a disabled uncategorized group", () => {
    const predecessors = new Map([]);
    const checkedKeys = new Set(["t:/foo"]);
    expect(getVisibleTopicKeys(predecessors, checkedKeys)).toEqual([]);
  });

  it("handles disabled uncategorized topics with an enabled uncategorized group", () => {
    const predecessors = new Map([]);
    const checkedKeys = new Set(["name:(Uncategorized)"]);
    expect(getVisibleTopicKeys(predecessors, checkedKeys)).toEqual([]);
  });
});

describe("migrateCheckedKeys", () => {
  it("handles topics becoming uncategorized", () => {
    const oldTree = {
      name: "root",
      children: [
        {
          name: "Foo Name",
          children: [{ name: "Foo Topic", topicName: "/foo_topic" }],
        },
      ],
    };
    const newTree = { name: "root", children: [] };
    const checkedKeys = ["t:/invisible_uncategorized_topic", "name:Foo Name", "t:/foo_topic"];
    expect(migrateCheckedKeys(oldTree, newTree, checkedKeys, (k) => k)).toEqual([
      "name:(Uncategorized)", // Enabled to show uncategorized /foo_topic.
      "name:Foo Name", // Kept. Doesn't matter.
      "t:/foo_topic",
      // No t:/invisible_uncategorized_topic.
    ]);
  });

  it("handles topics becoming categorized", () => {
    const oldTree = {
      name: "root",
      children: [
        {
          name: "Group",
          children: [{ name: "Invisible Topic", topicName: "/invisible_topic" }],
        },
      ],
    };
    const newTree = {
      name: "root",
      children: [
        {
          name: "Group",
          children: [
            { name: "Invisible Topic", topicName: "/invisible_topic" },
            { name: "Visible Topic", topicName: "/visible_topic" },
          ],
        },
      ],
    };
    // Invisible topic is checked, but name:Group isn't.
    const checkedKeys = ["name:(Uncategorized)", "t:/visible_topic", "t:/invisible_topic"];
    expect(migrateCheckedKeys(oldTree, newTree, checkedKeys, (k) => k)).toEqual([
      "name:(Uncategorized)", // Kept, doesn't matter.
      "name:Group", // Added to show /visible_topic
      "t:/visible_topic",
      // Removed t:/invisible_topic
    ]);
  });

  it("handles second-source topics", () => {
    const oldTree = {
      name: "root",
      children: [
        {
          name: "Old Group Name",
          children: [{ name: "Topic", topicName: "/topic" }],
        },
      ],
    };
    const newTree = {
      name: "root",
      children: [
        {
          name: "New Group Name",
          children: [{ name: "Topic", topicName: "/topic" }],
        },
      ],
    };
    const checkedKeys = [
      "name_2:Old Group Name",
      "t:/webviz_source_2/topic",
      "ns:/topic:some namespace name",
      "ns:/other_topic:some other namespace name",
    ];
    expect(migrateCheckedKeys(oldTree, newTree, checkedKeys, (k) => k)).toEqual([
      "name_2:New Group Name", // added
      "name_2:Old Group Name", // kept
      "ns:/other_topic:some other namespace name", // preserved
      "ns:/topic:some namespace name", // preserved
      "t:/webviz_source_2/topic",
    ]);
  });
});
