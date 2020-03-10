// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { pick } from "lodash";

import { DEFAULT_GROUP_PREFIXES_BY_COLUMN } from "./topicGroupsUtils";
import {
  toggleVisibility,
  toggleAllForGroupVisibility,
  toggleAllForTopicVisibility,
  keyboardToggleAllForGroupVisibility,
  keyboardToggleAllForTopicVisibility,
} from "./topicGroupsVisibilityUtils";
import type { TopicGroupType, TopicItem } from "./types";

// helper function to extract the relevant fields to simplify expect result
function getGroupMappedData({ visibilityByColumn, displayName, items }: TopicGroupType) {
  return {
    displayName,
    visibilityByColumn,
    items: items.map((item) => pick(item, ["topicName", "visibilityByColumn"])),
  };
}

function getTopicItemMappedData({ topicName, visibilityByColumn, selectedNamespacesByColumn }: TopicItem) {
  return {
    topicName,
    visibilityByColumn,
    selectedNamespacesByColumn,
  };
}
describe("toggleVisibility", () => {
  it("changes from all on to all off on toggle", () => {
    expect(toggleVisibility([true, true])).toEqual([false, false]);
  });

  it("changes from all off to all on on toggle", () => {
    expect(toggleVisibility([false, false])).toEqual([true, true]);
  });

  it("changes from some on/off to all off on toggle", () => {
    expect(toggleVisibility([false, true])).toEqual([false, false]);
    expect(toggleVisibility([true, false])).toEqual([false, false]);
  });
});

describe("toggleAllForGroupVisibility", () => {
  const testGroup = {
    displayName: "Group for Group Visibility Tests",
    visibilityByColumn: [true, false],
    derivedFields: {
      id: "Group-for-Group-Visibility-Tests_0",
      expanded: true,
      keyboardFocusIndex: -1,
      addTopicKeyboardFocusIndex: -1,
      isShownInList: true,
      prefixesByColumn: DEFAULT_GROUP_PREFIXES_BY_COLUMN,
      hasFeatureColumn: true,
    },
    items: [
      {
        topicName: "/g1_topic1",
        derivedFields: {
          id: "Group-for-Group-Visibility-Tests_0_0",
          keyboardFocusIndex: -1,
          isShownInList: true,
          displayName: "/g1_topic1",
          prefixByColumn: ["", "/webviz_bag_2"],
          namespaceDisplayVisibilityByNamespace: {},
          displayVisibilityByColumn: [
            { badgeText: "B1", isParentVisible: true, visible: false, available: true },
            null,
          ],
          datatype: "visualization_msgs/MarkerArray",
        },
      },
      {
        topicName: "/g1_topic2_ns",
        derivedFields: {
          id: "Group-for-Group-Visibility-Tests_0_1",
          keyboardFocusIndex: -1,
          isShownInList: true,
          displayName: "/g1_topic2_ns",
          prefixByColumn: ["", "/webviz_bag_2"],
          namespaceDisplayVisibilityByNamespace: {
            ns1: [{ isParentVisible: false, badgeText: "B1", visible: true, available: true }, null],
            ns2: [
              { isParentVisible: false, badgeText: "B1", visible: true, available: true },
              { isParentVisible: false, badgeText: "B1", visible: true, available: true },
            ],
            ns3: [null, { isParentVisible: false, badgeText: "B1", visible: true, available: true }],
          },
          displayVisibilityByColumn: [
            { badgeText: "B1", isParentVisible: true, visible: false, available: true },
            { badgeText: "B1", isParentVisible: false, visible: false, available: true },
          ],
          datatype: "visualization_msgs/MarkerArray",
        },
      },
      {
        topicName: "/g1_topic3_unavailable",
        derivedFields: {
          id: "Group-for-Group-Visibility-Tests_0_2",
          keyboardFocusIndex: -1,
          isShownInList: true,
          displayName: "/g1_topic3_unavailable",
          prefixByColumn: ["", "/webviz_bag_2"],
          namespaceDisplayVisibilityByNamespace: {},
          displayVisibilityByColumn: [null, null],
        },
      },
      {
        topicName: "/labels_json/g1_topic4",
        derivedFields: {
          id: "Group-for-Group-Visibility-Tests_0_3",
          keyboardFocusIndex: -1,
          isShownInList: true,
          displayName: "/labels_json/g1_topic4",
          prefixByColumn: ["", "/labels_json_2"],
          namespaceDisplayVisibilityByNamespace: {},
          displayVisibilityByColumn: [
            { badgeText: "B1", isParentVisible: true, visible: false, available: true },
            null,
          ],
          datatype: "visualization_msgs/MarkerArray",
        },
      },
      {
        topicName: "/webviz_tables/g1_topic5_tables",
        derivedFields: {
          id: "Group-for-Group-Visibility-Tests_0_4",
          keyboardFocusIndex: -1,
          isShownInList: true,
          displayName: "/webviz_tables/g1_topic5_tables",
          prefixByColumn: ["", "/webviz_bag_2"],
          namespaceDisplayVisibilityByNamespace: {},
          displayVisibilityByColumn: [
            { badgeText: "B1", isParentVisible: true, visible: false, available: true },
            null,
          ],
          datatype: "visualization_msgs/MarkerArray",
        },
      },
      {
        topicName: "/g1_topic6_tables_only_tables_2_available",
        derivedFields: {
          id: "Group-for-Group-Visibility-Tests_0_5",
          keyboardFocusIndex: -1,
          isShownInList: true,
          displayName: "/g1_topic6_tables_only_tables_2_available",
          prefixByColumn: ["", "/webviz_bag_2"],
          namespaceDisplayVisibilityByNamespace: {},
          displayVisibilityByColumn: [null, null],
        },
      },
      {
        topicName: "/g1_topic7_only_bag_2_available",
        derivedFields: {
          id: "Group-for-Group-Visibility-Tests_0_6",
          keyboardFocusIndex: -1,
          isShownInList: true,
          displayName: "/g1_topic7_only_bag_2_available",
          prefixByColumn: ["", "/webviz_bag_2"],
          namespaceDisplayVisibilityByNamespace: {},
          displayVisibilityByColumn: [
            null,
            { badgeText: "B1", isParentVisible: false, visible: false, available: true },
          ],
          datatype: "visualization_msgs/MarkerArray",
        },
      },
    ],
  };

  it("toggles all visibilities in the base column (true => false)", () => {
    const result = toggleAllForGroupVisibility(testGroup, 0);
    expect(getGroupMappedData(result)).toEqual({
      displayName: "Group for Group Visibility Tests",
      items: [
        { topicName: "/g1_topic1", visibilityByColumn: [false, false] },
        { topicName: "/g1_topic2_ns", visibilityByColumn: [false, false] },
        { topicName: "/g1_topic3_unavailable", visibilityByColumn: [false, false] },
        { topicName: "/labels_json/g1_topic4", visibilityByColumn: [false, false] },
        { topicName: "/webviz_tables/g1_topic5_tables", visibilityByColumn: [false, false] },
        { topicName: "/g1_topic6_tables_only_tables_2_available", visibilityByColumn: [false, false] },
        { topicName: "/g1_topic7_only_bag_2_available", visibilityByColumn: [false, false] },
      ],
      visibilityByColumn: [false, false],
    });
  });

  it("toggles all visibilities in the base column (false => true)", () => {
    const result = toggleAllForGroupVisibility({ ...testGroup, visibilityByColumn: [false, false] }, 0);
    expect(getGroupMappedData(result)).toEqual({
      displayName: "Group for Group Visibility Tests",
      items: [
        { topicName: "/g1_topic1", visibilityByColumn: [true, false] },
        { topicName: "/g1_topic2_ns", visibilityByColumn: [true, false] },
        { topicName: "/g1_topic3_unavailable", visibilityByColumn: [true, false] },
        { topicName: "/labels_json/g1_topic4", visibilityByColumn: [true, false] },
        { topicName: "/webviz_tables/g1_topic5_tables", visibilityByColumn: [true, false] },
        { topicName: "/g1_topic6_tables_only_tables_2_available", visibilityByColumn: [true, false] },
        { topicName: "/g1_topic7_only_bag_2_available", visibilityByColumn: [true, false] },
      ],
      visibilityByColumn: [true, false],
    });
  });
  it("toggles all visibilities using keyboard with [false, true] for group visibility", () => {
    const result = keyboardToggleAllForGroupVisibility({ ...testGroup, visibilityByColumn: [false, true] });
    expect(getGroupMappedData(result)).toEqual({
      displayName: "Group for Group Visibility Tests",
      items: [
        { topicName: "/g1_topic1", visibilityByColumn: [false, false] },
        { topicName: "/g1_topic2_ns", visibilityByColumn: [false, false] },
        { topicName: "/g1_topic3_unavailable", visibilityByColumn: [false, false] },
        { topicName: "/labels_json/g1_topic4", visibilityByColumn: [false, false] },
        { topicName: "/webviz_tables/g1_topic5_tables", visibilityByColumn: [false, false] },
        { topicName: "/g1_topic6_tables_only_tables_2_available", visibilityByColumn: [false, false] },
        { topicName: "/g1_topic7_only_bag_2_available", visibilityByColumn: [false, false] },
      ],
      visibilityByColumn: [false, false],
    });
  });
  it("toggles all visibilities using keyboard with [true true] for group visibility", () => {
    const result = keyboardToggleAllForGroupVisibility({ ...testGroup, visibilityByColumn: [true, true] });
    expect(getGroupMappedData(result)).toEqual({
      displayName: "Group for Group Visibility Tests",
      items: [
        { topicName: "/g1_topic1", visibilityByColumn: [false, false] },
        { topicName: "/g1_topic2_ns", visibilityByColumn: [false, false] },
        { topicName: "/g1_topic3_unavailable", visibilityByColumn: [false, false] },
        { topicName: "/labels_json/g1_topic4", visibilityByColumn: [false, false] },
        { topicName: "/webviz_tables/g1_topic5_tables", visibilityByColumn: [false, false] },
        { topicName: "/g1_topic6_tables_only_tables_2_available", visibilityByColumn: [false, false] },
        { topicName: "/g1_topic7_only_bag_2_available", visibilityByColumn: [false, false] },
      ],
      visibilityByColumn: [false, false],
    });
  });

  it("toggles all visibilities in the feature column (false => true)", () => {
    const result = toggleAllForGroupVisibility({ ...testGroup, visibilityByColumn: [true, false] }, 1);
    expect(getGroupMappedData(result)).toEqual({
      displayName: "Group for Group Visibility Tests",
      items: [
        { topicName: "/g1_topic1", visibilityByColumn: [false, true] },
        { topicName: "/g1_topic2_ns", visibilityByColumn: [false, true] },
        { topicName: "/g1_topic3_unavailable", visibilityByColumn: [false, true] },
        { topicName: "/labels_json/g1_topic4", visibilityByColumn: [false, true] },
        { topicName: "/webviz_tables/g1_topic5_tables", visibilityByColumn: [false, true] },
        { topicName: "/g1_topic6_tables_only_tables_2_available", visibilityByColumn: [false, true] },
        { topicName: "/g1_topic7_only_bag_2_available", visibilityByColumn: [false, true] },
      ],
      visibilityByColumn: [true, true],
    });
  });

  it("toggles all visibilities in the feature column (true => false)", () => {
    const result = toggleAllForGroupVisibility({ ...testGroup, visibilityByColumn: [true, true] }, 1);
    expect(getGroupMappedData(result)).toEqual({
      displayName: "Group for Group Visibility Tests",
      items: [
        { topicName: "/g1_topic1", visibilityByColumn: [false, false] },
        { topicName: "/g1_topic2_ns", visibilityByColumn: [false, false] },
        { topicName: "/g1_topic3_unavailable", visibilityByColumn: [false, false] },
        { topicName: "/labels_json/g1_topic4", visibilityByColumn: [false, false] },
        { topicName: "/webviz_tables/g1_topic5_tables", visibilityByColumn: [false, false] },
        { topicName: "/g1_topic6_tables_only_tables_2_available", visibilityByColumn: [false, false] },
        { topicName: "/g1_topic7_only_bag_2_available", visibilityByColumn: [false, false] },
      ],
      visibilityByColumn: [true, false],
    });
  });
});

describe("toggleAllForTopicVisibility", () => {
  it("toggles all visibilities in the base topic (only base available)", () => {
    const topicItem = {
      topicName: "/g2_topic1_ns_base_only",
      visibilityByColumn: [true, false],
      derivedFields: {
        id: "Group-for-Topic-Visibility-Tests_1_0",
        keyboardFocusIndex: -1,
        isShownInList: true,
        displayName: "/g2_topic1_ns_base_only",
        prefixByColumn: ["", "/webviz_bag_2"],
        namespaceDisplayVisibilityByNamespace: {
          g2t1ns1: [{ isParentVisible: false, badgeText: "B1", visible: true, available: true }, null],
        },
        displayVisibilityByColumn: [{ badgeText: "B1", isParentVisible: false, visible: true, available: true }, null],
        datatype: "visualization_msgs/MarkerArray",
      },
    };

    expect(getTopicItemMappedData(toggleAllForTopicVisibility(topicItem, 0))).toEqual({
      selectedNamespacesByColumn: [[], []],
      topicName: "/g2_topic1_ns_base_only",
      visibilityByColumn: [false, false],
    });
  });

  it("toggles all visibilities in the feature topic (only feature available)", () => {
    const topicItem = {
      topicName: "/g2_topic2_ns_feature_only",
      visibilityByColumn: [false, false],
      derivedFields: {
        id: "Group-for-Topic-Visibility-Tests_1_1",
        keyboardFocusIndex: -1,
        isShownInList: true,
        displayName: "/g2_topic2_ns_feature_only",
        prefixByColumn: ["", "/webviz_bag_2"],
        namespaceDisplayVisibilityByNamespace: {
          g2t2ns1: [null, { isParentVisible: false, badgeText: "B1", visible: true, available: true }],
        },
        displayVisibilityByColumn: [null, { badgeText: "B1", isParentVisible: false, visible: false, available: true }],
        datatype: "visualization_msgs/MarkerArray",
      },
    };
    expect(getTopicItemMappedData(toggleAllForTopicVisibility(topicItem, 1))).toEqual({
      topicName: "/g2_topic2_ns_feature_only",
      visibilityByColumn: [false, true],
      selectedNamespacesByColumn: [[], ["g2t2ns1"]],
    });
  });

  it("toggles all visibilities using keyboard", () => {
    const topicItem = {
      topicName: "/g2_topic2_ns_feature_only",
      visibilityByColumn: [false, false],
      derivedFields: {
        id: "Group-for-Topic-Visibility-Tests_1_1",
        keyboardFocusIndex: -1,
        isShownInList: true,
        displayName: "/g2_topic2_ns_feature_only",
        prefixByColumn: ["", "/webviz_bag_2"],
        namespaceDisplayVisibilityByNamespace: {
          g2t2ns1: [null, { isParentVisible: false, badgeText: "B1", visible: true, available: true }],
        },
        displayVisibilityByColumn: [null, { badgeText: "B1", isParentVisible: false, visible: false, available: true }],
        datatype: "visualization_msgs/MarkerArray",
      },
    };
    expect(getTopicItemMappedData(keyboardToggleAllForTopicVisibility(topicItem))).toEqual({
      selectedNamespacesByColumn: [["g2t2ns1"], ["g2t2ns1"]],
      topicName: "/g2_topic2_ns_feature_only",
      visibilityByColumn: [true, true],
    });
    expect(
      getTopicItemMappedData(keyboardToggleAllForTopicVisibility({ ...topicItem, visibilityByColumn: [true, false] }))
    ).toEqual({
      selectedNamespacesByColumn: [[], []],
      topicName: "/g2_topic2_ns_feature_only",
      visibilityByColumn: [false, false],
    });
  });

  it("toggles all visibilities in the base (both base and feature are available)", () => {
    // step 1: toggle all to be true on base topic
    const topicItem = {
      topicName: "/g2_topic3_ns_base_and_feature",
      visibilityByColumn: [false, true],
      derivedFields: {
        id: "Group-for-Topic-Visibility-Tests_1_2",
        keyboardFocusIndex: -1,
        isShownInList: true,
        displayName: "/g2_topic3_ns_base_and_feature",
        prefixByColumn: ["", "/webviz_bag_2"],
        namespaceDisplayVisibilityByNamespace: {
          g2t3ns1: [{ isParentVisible: false, badgeText: "B1", visible: true, available: true }, null],
          g2t3ns2: [
            { isParentVisible: false, badgeText: "B1", visible: true, available: true },
            { isParentVisible: false, badgeText: "B1", visible: true, available: true },
          ],
          g2t3ns3: [null, { isParentVisible: false, badgeText: "B1", visible: true, available: true }],
        },
        displayVisibilityByColumn: [
          { badgeText: "B1", isParentVisible: false, visible: false, available: true },
          { badgeText: "B1", isParentVisible: false, visible: true, available: true },
        ],
        datatype: "visualization_msgs/MarkerArray",
      },
    };

    let topicItemResult = toggleAllForTopicVisibility(topicItem, 0);
    expect(getTopicItemMappedData(topicItemResult)).toEqual({
      selectedNamespacesByColumn: [["g2t3ns1", "g2t3ns2", "g2t3ns3"], []],
      topicName: "/g2_topic3_ns_base_and_feature",
      visibilityByColumn: [true, true],
    });

    // step 2: toggle all to be false on feature topic, the base selectedNamespacesByColumn should stay as it is
    topicItemResult = toggleAllForTopicVisibility(topicItemResult, 1);
    expect(getTopicItemMappedData(topicItemResult)).toEqual({
      selectedNamespacesByColumn: [["g2t3ns1", "g2t3ns2", "g2t3ns3"], []],
      topicName: "/g2_topic3_ns_base_and_feature",
      visibilityByColumn: [true, false],
    });

    // step 3: toggle all to be true on feature topic
    topicItemResult = toggleAllForTopicVisibility(topicItemResult, 1);
    expect(getTopicItemMappedData(topicItemResult)).toEqual({
      selectedNamespacesByColumn: [["g2t3ns1", "g2t3ns2", "g2t3ns3"], ["g2t3ns1", "g2t3ns2", "g2t3ns3"]],
      topicName: "/g2_topic3_ns_base_and_feature",
      visibilityByColumn: [true, true],
    });
  });
});
