// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { buildItemDisplayNameMap } from "./topicGroupsUtils";

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
  describe("buildItemDisplayNameMap", () => {
    it("maps extension and topic to displayName", () => {
      expect(buildItemDisplayNameMap()).toEqual({
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
});
