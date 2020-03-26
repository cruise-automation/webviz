// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { generateNewTreeAndCreateNodeList } from "./AddFromPopularTopics";
import { transformTopicTree } from "./topicGroupsUtils";

const OLD_TOPIC_TREE_CONFIG = {
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

describe("generateNewTreeAndCreateNodeList", () => {
  it("generates a new tree and returns the nodes", () => {
    const oldTreeData = transformTopicTree(OLD_TOPIC_TREE_CONFIG);
    expect(generateNewTreeAndCreateNodeList(oldTreeData.children || [], [])).toEqual({
      nodeList: [
        { filterKey: "Map /metadata", key: "/metadata", name: "Map", parentKeys: [], topicName: "/metadata" },
        {
          filterKey: "Some Topic in JSON Tree /topic_in_json_tree",
          key: "/topic_in_json_tree",
          name: "Some Topic in JSON Tree",
          parentKeys: [],
          topicName: "/topic_in_json_tree",
        },
        { filterKey: "TF /tf", key: "/tf", name: "TF", parentKeys: [], topicName: "/tf" },
        { filterKey: "Nested Group ", key: "Nested Group", name: "Nested Group", parentKeys: [] },
        {
          filterKey: "Nested Group Topic A /topic_a",
          key: "/topic_a",
          name: "Topic A",
          parentKeys: ["Nested Group"],
          topicName: "/topic_a",
        },
        {
          filterKey: "Nested Group Topic B /topic_b",
          key: "/topic_b",
          name: "Topic B",
          parentKeys: ["Nested Group"],
          topicName: "/topic_b",
        },
        {
          filterKey: "Nested Group Deeply Nested Group ",
          key: "Deeply Nested Group",
          name: "Deeply Nested Group",
          parentKeys: ["Nested Group"],
        },
        {
          filterKey: "Nested Group Deeply Nested Group /topic_c",
          key: "/topic_c",
          parentKeys: ["Nested Group", "Deeply Nested Group"],
          topicName: "/topic_c",
        },
        { filterKey: "Nested Group /topic_d", key: "/topic_d", parentKeys: ["Nested Group"], topicName: "/topic_d" },
      ],
      treeData: [
        { filterKey: "Map /metadata", key: "/metadata", name: "Map", parentKeys: [], topicName: "/metadata" },
        {
          filterKey: "Some Topic in JSON Tree /topic_in_json_tree",
          key: "/topic_in_json_tree",
          name: "Some Topic in JSON Tree",
          parentKeys: [],
          topicName: "/topic_in_json_tree",
        },
        { filterKey: "TF /tf", key: "/tf", name: "TF", parentKeys: [], topicName: "/tf" },
        {
          children: [
            {
              filterKey: "Nested Group Topic A /topic_a",
              key: "/topic_a",
              name: "Topic A",
              parentKeys: ["Nested Group"],
              topicName: "/topic_a",
            },
            {
              filterKey: "Nested Group Topic B /topic_b",
              key: "/topic_b",
              name: "Topic B",
              parentKeys: ["Nested Group"],
              topicName: "/topic_b",
            },
            {
              children: [
                {
                  filterKey: "Nested Group Deeply Nested Group /topic_c",
                  key: "/topic_c",
                  parentKeys: ["Nested Group", "Deeply Nested Group"],
                  topicName: "/topic_c",
                },
              ],
              filterKey: "Nested Group Deeply Nested Group ",
              key: "Deeply Nested Group",
              name: "Deeply Nested Group",
              parentKeys: ["Nested Group"],
            },
            {
              filterKey: "Nested Group /topic_d",
              key: "/topic_d",
              parentKeys: ["Nested Group"],
              topicName: "/topic_d",
            },
          ],
          filterKey: "Nested Group ",
          key: "Nested Group",
          name: "Nested Group",
          parentKeys: [],
        },
      ],
    });
  });
});
