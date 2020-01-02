// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import AnimationOutlineIcon from "@mdi/svg/svg/animation-outline.svg";
import { get } from "lodash";

import { TOPIC_DISPLAY_MODES } from "webviz-core/src/panels/ThreeDimensionalViz/TopicSelector/TopicDisplayModeSelector";
import buildTree, { TopicTreeNode } from "webviz-core/src/panels/ThreeDimensionalViz/TopicSelector/treeBuilder";
import {
  getCheckedTopicsAndExtensions,
  getTopicConfig,
  getNewCheckedNodes,
  setVisibleByHiddenTopics,
  BAG1_TOPIC_GROUP_NAME,
  BAG2_TOPIC_GROUP_NAME,
} from "webviz-core/src/panels/ThreeDimensionalViz/topicTreeUtils";
import type { Topic } from "webviz-core/src/players/types";

const BAG1_NODE_NAME = `name:${BAG1_TOPIC_GROUP_NAME}`;
const BAG2_NODE_NAME = `name:${BAG2_TOPIC_GROUP_NAME}`;
const TOPIC_CONFIG = {
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
              ],
            },
          ],
        }),
      },
    }),
  }),
}));

const checkedNodes = [
  "name:Ext A",
  "name:Deeply Nested Group",
  "t:/topic_b",
  "x:ExtA.a",
  "x:ExtC.c",
  "ns:/topic_c:some_namespace",
  "ns:/webviz_bag_2/topic_c:some_namespace",
  "ns:/ns_to_ignore_due_to_lacking_of_topic_checked:some_name",
  "t:/topic_c",
  "t:/webviz_bag_2/topic_c",
];

function makeTopic(topics: string[], unsupportedDatatypeIndexes?: number[] = []): Topic[] {
  return topics.map((name, idx) => ({
    name,
    datatype: unsupportedDatatypeIndexes.includes(idx) ? "unsupported_type" : "some_type",
  }));
}

const bag1Topics = [
  "/topic_a",
  "/topic_not_in_json_tree", // this topic is not in the topicConfig
  "/topic_c",
  "/topic_b",
];
const bag2Topics = [
  "/webviz_bag_2/topic_a",
  "/webviz_bag_2/topic_b",
  "/webviz_bag_2/topic_c",
  "/webviz_bag_2/topic_not_in_json_tree",
];

const defaultGetTopicConfigInput = {
  topicDisplayMode: TOPIC_DISPLAY_MODES.SHOW_SELECTED.value,
  checkedNodes,
  topics: makeTopic([...bag1Topics, ...bag2Topics]),
  supportedMarkerDatatypes: ["some_type"],
};

const defaultExpectedBag1Nodes = [
  {
    name: "Ext A",
    extension: "ExtA.a",
  },
  {
    name: "Ext A / Ext C",
    extension: "ExtC.c",
  },
  {
    name: "Nested Group / Topic B",
    topic: "/topic_b",
  },
  {
    name: "Nested Group / Deeply Nested Group",
    topic: "/topic_c",
  },
];

describe("getTopicConfig", () => {
  describe("topicConfig", () => {
    describe("show tree structure", () => {
      it("returns the default tree", () => {
        expect(
          getTopicConfig({
            topicDisplayMode: TOPIC_DISPLAY_MODES.SHOW_TREE.value,
            checkedNodes: [],
            topics: [],
            supportedMarkerDatatypes: [],
          }).topicConfig
        ).toEqual(TOPIC_CONFIG);
      });
    });

    describe("show flat list", () => {
      it("topicDisplayMode.SHOW_SELECTED", () => {
        expect(
          getTopicConfig({
            ...defaultGetTopicConfigInput,
          }).topicConfig
        ).toEqual({
          children: [
            {
              name: BAG1_TOPIC_GROUP_NAME,
              children: defaultExpectedBag1Nodes,
            },
            {
              name: BAG2_TOPIC_GROUP_NAME,
              children: [
                {
                  name: "Nested Group / Deeply Nested Group",
                  topic: "/webviz_bag_2/topic_c",
                },
              ],
            },
          ],
          name: "root",
        });
      });
      it("topicDisplayMode.SHOW_AVAILABLE", () => {
        expect(
          getTopicConfig({
            ...defaultGetTopicConfigInput,
            topicDisplayMode: TOPIC_DISPLAY_MODES.SHOW_AVAILABLE.value,
          })
        ).toMatchSnapshot();
      });
      it("topicDisplayMode.showAll", () => {
        expect(
          getTopicConfig({
            ...defaultGetTopicConfigInput,
            topicDisplayMode: TOPIC_DISPLAY_MODES.SHOW_ALL.value,
          }).topicConfig
        ).toMatchSnapshot();
      });

      it("shows flat topic list for bag1 topics", () => {
        expect(
          getTopicConfig({
            ...defaultGetTopicConfigInput,
            topics: makeTopic(bag1Topics),
          }).topicConfig.children
        ).toEqual(defaultExpectedBag1Nodes);
      });
      it("shows bag1 and bag2 for topics that are all prefixed with /webviz_bag_2", () => {
        expect(
          getTopicConfig({
            ...defaultGetTopicConfigInput,
            checkedNodes: ["t:/webviz_bag_2/topic_b", "t:/webviz_bag_2/topic_not_in_json_tree"],
            topics: makeTopic(bag2Topics),
          }).topicConfig.children
        ).toEqual([
          {
            name: BAG1_TOPIC_GROUP_NAME,
            children: [],
          },
          {
            name: BAG2_TOPIC_GROUP_NAME,
            children: [
              { name: "Nested Group / Topic B", topic: "/webviz_bag_2/topic_b" },
              { name: "/topic_not_in_json_tree", topic: "/webviz_bag_2/topic_not_in_json_tree" },
            ],
          },
        ]);
      });

      it("adds uncategorized topics to bag1 and bag2", () => {
        expect(
          getTopicConfig({
            ...defaultGetTopicConfigInput,
            checkedNodes: [...checkedNodes, "t:/topic_not_in_json_tree"],
            topics: makeTopic([...bag1Topics, ...bag2Topics]),
          }).topicConfig.children
        ).toEqual([
          {
            children: [
              { extension: "ExtA.a", name: "Ext A" },
              { extension: "ExtC.c", name: "Ext A / Ext C" },
              { name: "Nested Group / Topic B", topic: "/topic_b" },
              { name: "Nested Group / Deeply Nested Group", topic: "/topic_c" },
              { name: "/topic_not_in_json_tree", topic: "/topic_not_in_json_tree" },
            ],
            name: BAG1_TOPIC_GROUP_NAME,
          },
          {
            children: [{ name: "Nested Group / Deeply Nested Group", topic: "/webviz_bag_2/topic_c" }],
            name: BAG2_TOPIC_GROUP_NAME,
          },
        ]);

        expect(
          getTopicConfig({
            ...defaultGetTopicConfigInput,
            checkedNodes: [...checkedNodes, "t:/webviz_bag_2/topic_not_in_json_tree"],
            topics: makeTopic([...bag1Topics, ...bag2Topics]),
          }).topicConfig.children
        ).toEqual([
          {
            children: [
              { extension: "ExtA.a", name: "Ext A" },
              { extension: "ExtC.c", name: "Ext A / Ext C" },
              { name: "Nested Group / Topic B", topic: "/topic_b" },
              { name: "Nested Group / Deeply Nested Group", topic: "/topic_c" },
            ],
            name: BAG1_TOPIC_GROUP_NAME,
          },
          {
            children: [
              { name: "Nested Group / Deeply Nested Group", topic: "/webviz_bag_2/topic_c" },
              { name: "/topic_not_in_json_tree", topic: "/webviz_bag_2/topic_not_in_json_tree" },
            ],
            name: BAG2_TOPIC_GROUP_NAME,
          },
        ]);

        expect(
          getTopicConfig({
            ...defaultGetTopicConfigInput,
            checkedNodes: [...checkedNodes, "t:/webviz_bag_2/topic_b", "t:/webviz_bag_2/topic_not_in_json_tree"],
            topics: makeTopic(bag2Topics),
          }).topicConfig.children
        ).toEqual([
          {
            children: [
              { extension: "ExtA.a", name: "Ext A" },
              { extension: "ExtC.c", name: "Ext A / Ext C" },
              { name: "Nested Group / Topic B", topic: "/topic_b" },
              { name: "Nested Group / Deeply Nested Group", topic: "/topic_c" },
            ],
            name: BAG1_TOPIC_GROUP_NAME,
          },
          {
            children: [
              { name: "Nested Group / Topic B", topic: "/webviz_bag_2/topic_b" },
              { name: "Nested Group / Deeply Nested Group", topic: "/webviz_bag_2/topic_c" },
              { name: "/topic_not_in_json_tree", topic: "/webviz_bag_2/topic_not_in_json_tree" },
            ],
            name: BAG2_TOPIC_GROUP_NAME,
          },
        ]);
      });
    });

    it("does not add prefixed topic to uncategorized (usually does not have preconfigured node name)", () => {
      expect(
        getTopicConfig({
          ...defaultGetTopicConfigInput,
          topicDisplayMode: TOPIC_DISPLAY_MODES.SHOW_AVAILABLE.value,
          checkedNodes: ["t:/webviz_bag_2/topic_in_json_tree"],
          topics: makeTopic(["/webviz_bag_2/topic_in_json_tree"]),
        }).topicConfig.children
      ).toEqual([
        {
          children: [
            { extension: "ExtA.a", name: "Ext A" },
            { extension: "ExtB.b", name: "Ext A / Ext B" },
            { extension: "ExtC.c", name: "Ext A / Ext C" },
            // `/topic_in_json_tree` is only available in the 2nd bag, we'll remove the bag prefix
            // and use that to look up the topic node's name `Some Topic in JSON Tree`
            { name: "Some Topic in JSON Tree", topic: "/topic_in_json_tree" },
            { children: [], description: "Visualize relationships between /tf frames.", name: "TF" },
          ],
          name: BAG1_TOPIC_GROUP_NAME,
        },
        {
          children: [{ name: "Some Topic in JSON Tree", topic: "/webviz_bag_2/topic_in_json_tree" }],
          name: BAG2_TOPIC_GROUP_NAME,
        },
      ]);
    });

    it("filters out topics with unsupported datatypes", () => {
      expect(
        getTopicConfig({
          checkedNodes: ["t:/topic_a", "t:/topic_b", "t:/webviz_bag_2/topic_b"],
          topicDisplayMode: TOPIC_DISPLAY_MODES.SHOW_SELECTED.value,
          topics: makeTopic(["/topic_a", "/topic_b", "/webviz_bag_2/topic_b"], [1, 2]),
          supportedMarkerDatatypes: ["some_type"],
        }).topicConfig
        // '/topic_b' and  '/webviz_bag_2/topic_b' are filtered out for having unsupported datatypes
      ).toEqual({ children: [{ name: "Nested Group / Topic A", topic: "/topic_a" }], name: "root" });
    });
  });

  describe("checkedNodes", () => {
    it("returns the checkedNodes identity when none of the checked topics are available", () => {
      const result = [];
      expect(getTopicConfig({ ...defaultGetTopicConfigInput, checkedNodes: result }).newCheckedNodes).toBe(result);
    });

    it("creates new checkedNodes with bag1/bag2 group names", () => {
      expect(
        getTopicConfig({
          ...defaultGetTopicConfigInput,
          checkedNodes: ["t:/topic_c"],
        }).newCheckedNodes
      ).toEqual(["t:/topic_c", BAG1_NODE_NAME]);
      expect(
        getTopicConfig({
          ...defaultGetTopicConfigInput,
          checkedNodes: ["t:/webviz_bag_2/topic_c"],
        }).newCheckedNodes
      ).toEqual(["t:/webviz_bag_2/topic_c", BAG2_NODE_NAME]);
      const checkedNodes1 = [...checkedNodes, "/webviz_bag_2/topic_b"];
      expect(
        getTopicConfig({
          ...defaultGetTopicConfigInput,
          checkedNodes: checkedNodes1,
        }).newCheckedNodes
      ).toEqual([...checkedNodes1, BAG1_NODE_NAME, BAG2_NODE_NAME]);
    });

    it("handles checked topic that does not start with 't:'", () => {
      expect(
        getTopicConfig({
          ...defaultGetTopicConfigInput,
          checkedNodes: ["/topic_c"], // does not have `t:` prefi
        })
      ).toEqual({
        newCheckedNodes: ["/topic_c", "name:Bag"],
        topicConfig: {
          children: [
            { children: [{ name: "Nested Group / Deeply Nested Group", topic: "/topic_c" }], name: "Bag" },
            { children: [], name: "Bag 2 /webviz_bag_2" },
          ],
          name: "root",
        },
      });
    });
  });

  describe("tf node", () => {
    it("adds tf node when showing all topics", () => {
      const children = getTopicConfig({
        ...defaultGetTopicConfigInput,
        topicDisplayMode: TOPIC_DISPLAY_MODES.SHOW_ALL.value,
      }).topicConfig.children;
      const bag1TfNode = get(children, ["0", "children"]).find((node) => node.name === "TF");
      expect(bag1TfNode).toEqual({
        children: [],
        description: "Visualize relationships between /tf frames.",
        name: "TF",
      });
    });

    it("adds tf node to the bag1 nodes when showing available topics and topics are not empty (while playing)", () => {
      // no tf node when `topics` is empty
      expect(
        getTopicConfig({
          ...defaultGetTopicConfigInput,
          topics: [],
          topicDisplayMode: TOPIC_DISPLAY_MODES.SHOW_AVAILABLE.value,
        }).topicConfig.children
      ).toEqual([
        {
          name: "Ext A",
          extension: "ExtA.a",
        },
        {
          name: "Ext A / Ext B",
          extension: "ExtB.b",
        },
        {
          name: "Ext A / Ext C",
          extension: "ExtC.c",
        },
      ]);

      const children = getTopicConfig({
        ...defaultGetTopicConfigInput,
        topicDisplayMode: TOPIC_DISPLAY_MODES.SHOW_AVAILABLE.value,
      }).topicConfig.children;

      const bag1TfNode = get(children, ["0", "children"]).find((node) => node.name === "TF");
      const bag2TfNode = get(children, ["1", "children"]).find((node) => node.name === "TF");
      expect(bag1TfNode).toEqual({
        children: [],
        description: "Visualize relationships between /tf frames.",
        name: "TF",
      });
      expect(bag2TfNode).toBeUndefined();
    });

    it("adds tf node to bag1 when showing checked and checkedNodes has 'name:TF'", () => {
      expect(
        getTopicConfig({
          ...defaultGetTopicConfigInput,
          topicDisplayMode: TOPIC_DISPLAY_MODES.SHOW_SELECTED.value,
        }).topicConfig.children
      ).toEqual([
        {
          children: defaultExpectedBag1Nodes,
          name: BAG1_TOPIC_GROUP_NAME,
        },
        {
          children: [
            {
              name: "Nested Group / Deeply Nested Group",
              topic: "/webviz_bag_2/topic_c",
            },
          ],
          name: BAG2_TOPIC_GROUP_NAME,
        },
      ]);
      expect(
        getTopicConfig({
          ...defaultGetTopicConfigInput,
          checkedNodes: [...checkedNodes, "name:TF"],
          topicDisplayMode: TOPIC_DISPLAY_MODES.SHOW_SELECTED.value,
        }).topicConfig.children
      ).toEqual([
        {
          children: [
            ...defaultExpectedBag1Nodes,
            { children: [], description: "Visualize relationships between /tf frames.", name: "TF" },
          ],
          name: BAG1_TOPIC_GROUP_NAME,
        },
        {
          children: [
            {
              name: "Nested Group / Deeply Nested Group",
              topic: "/webviz_bag_2/topic_c",
            },
          ],
          name: BAG2_TOPIC_GROUP_NAME,
        },
      ]);
    });
  });
});

describe("getCheckedTopicsAndExtensions", () => {
  it("returns extensions and topics", () => {
    const expected = getCheckedTopicsAndExtensions(checkedNodes);
    expect([...expected.selectedExtensionsSet]).toEqual(["ExtA.a", "ExtC.c"]);
    expect([...expected.selectedTopicsSet]).toEqual(["/topic_b", "/topic_c", "/webviz_bag_2/topic_c"]);
  });
});

describe("getNewCheckedNodes", () => {
  const exampleCheckedNodes = ["t:/foo/bar", "t:/webviz_bag_2/foo", "t:/webviz_bag_121/bar", "t:/foo1"];
  it("returns new exampleCheckedNodes with bag1 topic group name when any bag1 topics are checked", () => {
    expect(getNewCheckedNodes(["/foo1", "/foo/bar"], exampleCheckedNodes)).not.toBe(exampleCheckedNodes);
    expect(getNewCheckedNodes(["/foo1", "/foo/bar"], exampleCheckedNodes)).toEqual([
      ...exampleCheckedNodes,
      BAG1_NODE_NAME,
    ]);
  });
  it("returns new exampleCheckedNodes with bag2 topic group name when any bag2 topics are checked", () => {
    expect(getNewCheckedNodes(["/webviz_bag_2/foo/bar"], exampleCheckedNodes)).toEqual([
      ...exampleCheckedNodes,
      BAG2_NODE_NAME,
    ]);
  });
  it("returns new exampleCheckedNodes with both bag1 and bag2 topic group names", () => {
    expect(getNewCheckedNodes(["/foo1", "/webviz_bag_2/foo/bar"], exampleCheckedNodes)).toEqual([
      ...exampleCheckedNodes,
      BAG1_NODE_NAME,
      BAG2_NODE_NAME,
    ]);
  });
  it("returns the original checkedNodes if it already contains bag1/bag2 topic group names", () => {
    const checkedNodes1 = [BAG1_NODE_NAME, ...exampleCheckedNodes];
    expect(getNewCheckedNodes(["/foo/bar"], checkedNodes1)).toBe(checkedNodes1);
    const checkedNodes2 = [BAG2_NODE_NAME, ...exampleCheckedNodes];
    expect(getNewCheckedNodes(["/webviz_bag_2/foo/bar"], checkedNodes2)).toBe(checkedNodes2);
    const checkedNodes3 = [BAG1_NODE_NAME, BAG2_NODE_NAME, ...exampleCheckedNodes];
    expect(getNewCheckedNodes(["/foo1", "/webviz_bag_2/foo/bar"], checkedNodes3)).toBe(checkedNodes3);
  });
});

describe("setVisibleByHiddenTopics", () => {
  it("sets visible on the tree nodes based on hiddenTopics (single bag)", () => {
    const currentCheckedNodes = ["t:/topic_not_in_json_tree"];
    const topicConfig = getTopicConfig({
      ...defaultGetTopicConfigInput,
      topics: makeTopic(bag1Topics),
      checkedNodes: currentCheckedNodes,
      topicDisplayMode: TOPIC_DISPLAY_MODES.SHOW_SELECTED.value,
    }).topicConfig;
    const props = {
      topics: [],
      namespaces: [],
      checkedNodes: currentCheckedNodes,
      expandedNodes: [],
      modifiedNamespaceTopics: [],
      transforms: [],
      icons: { "visualization_msgs/Marker": AnimationOutlineIcon },
      topicDisplayMode: TOPIC_DISPLAY_MODES.SHOW_SELECTED.value,
      topicConfig,
    };
    const tree = buildTree(props);
    const node = tree.find((foundNode) => foundNode.topic === "/topic_not_in_json_tree");
    expect(node).toBeInstanceOf(TopicTreeNode);
    expect(node && node.visible).toBe(true);
    setVisibleByHiddenTopics(tree, ["/topic_not_in_json_tree"]);
    expect(node && node.visible).toBe(false);
  });

  it("sets visible on the tree nodes based on hiddenTopics (2 bags)", () => {
    const currentCheckedNodes = ["t:/topic_b", "t:/webviz_bag_2/topic_c"];
    const topicConfig = getTopicConfig({
      ...defaultGetTopicConfigInput,
      checkedNodes: currentCheckedNodes,
      topicDisplayMode: TOPIC_DISPLAY_MODES.SHOW_SELECTED.value,
    }).topicConfig;
    const props = {
      topics: [],
      namespaces: [],
      checkedNodes: currentCheckedNodes,
      expandedNodes: [],
      modifiedNamespaceTopics: [],
      transforms: [],
      icons: { "visualization_msgs/Marker": AnimationOutlineIcon },
      topicDisplayMode: TOPIC_DISPLAY_MODES.SHOW_SELECTED.value,
      topicConfig,
    };
    const tree = buildTree(props);
    const node = tree.find((foundNode) => foundNode.topic === "/topic_b");
    expect(node && node.visible).toBe(true);
    setVisibleByHiddenTopics(tree, ["/topic_b"]);
    expect(node && node.visible).toBe(false);

    const node2 = tree.find((foundNode) => foundNode.topic === "/webviz_bag_2/topic_c");
    expect(node2).toBeInstanceOf(TopicTreeNode);
    expect(node2 && node2.visible).toBe(true);
    setVisibleByHiddenTopics(tree, ["/webviz_bag_2/topic_c"]);
    expect(node2 && node2.visible).toBe(false);
  });
});
