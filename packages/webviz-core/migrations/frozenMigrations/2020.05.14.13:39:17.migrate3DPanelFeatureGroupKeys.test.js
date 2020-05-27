// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { migrate3DPanelFeatureGroupKeys } from "webviz-core/migrations/frozenMigrations/2020.05.14.13:39:17.migrate3DPanelFeatureGroupKeys";

const TOPIC_CONFIG = {
  name: "root",
  children: [
    { name: "Some Topic in JSON Tree", topicName: "/topic_in_json_tree" },
    { name: "TF", children: [], description: "Visualize relationships between /tf frames." },
    {
      name: "Nested Group",
      children: [
        { name: "Topic B", topicName: "/topic_b" },
        { name: "Deeply Nested Group", children: [{ topicName: "/topic_c" }] },
      ],
    },
  ],
};

describe("migrate3DPanelFeatureGroupKeys", () => {
  it("adds feature group keys", () => {
    const currentProps = {
      savedPropsVersion: 18,
      checkedKeys: [
        "t:/tf",
        "t:/topic_a",
        "t:/webviz_source_2/topic_c",
        "name:(Uncategorized)",
        "t:/webviz_source_2/topic_in_json_tree",
      ],
      checkedNodes: [],
    };
    expect(migrate3DPanelFeatureGroupKeys((currentProps: any), TOPIC_CONFIG).checkedKeys).toEqual([
      "t:/tf",
      "t:/topic_a",
      "t:/webviz_source_2/topic_c",
      "name:(Uncategorized)",
      "t:/webviz_source_2/topic_in_json_tree",
      "name_2:Deeply Nested Group",
      "name_2:Nested Group",
    ]);
  });
});
