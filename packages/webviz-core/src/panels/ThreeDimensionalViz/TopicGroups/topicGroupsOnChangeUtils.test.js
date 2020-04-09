// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { compact, omit, set, cloneDeep } from "lodash";

import { FOCUS_ITEM_OPS } from "./constants";
import { getOnTopicGroupsChangeDataByKeyboardOp } from "./topicGroupsOnChangeUtils";
import { updateFocusIndexesAndGetFocusData, DEFAULT_GROUP_PREFIXES_BY_COLUMN } from "./topicGroupsUtils";
import type { TopicGroupType } from "./types";

const TOPIC_GROUPS = [
  {
    displayName: "Some Group",
    items: [
      {
        derivedFields: {
          prefixByColumn: ["", "/webviz_bag_2"],
          datatype: "visualization_msgs/MarkerArray",
          displayName: "/foo1",
          displayVisibilityByColumn: [
            { available: true, badgeText: "B1", isParentVisible: true, visible: true },
            { available: true, badgeText: "B2", isParentVisible: true, visible: true },
          ],
          sortedNamespaceDisplayVisibilityByColumn: [],
          id: "Some-Group_0_0",
          isShownInList: true,
          keyboardFocusIndex: -1,
        },
        expanded: true,
        topicName: "/foo1",
        visibilityByColumn: [true, true],
      },
      {
        derivedFields: {
          prefixByColumn: ["", "/webviz_bag_2"],
          datatype: "visualization_msgs/MarkerArray",
          displayName: "/foo2",
          displayVisibilityByColumn: [
            { available: true, badgeText: "B1", isParentVisible: true, visible: false },
            { available: true, badgeText: "B2", isParentVisible: true, visible: true },
          ],
          sortedNamespaceDisplayVisibilityByColumn: [],
          id: "Some-Group_0_1",
          isShownInList: true,
          keyboardFocusIndex: -1,
        },
        topicName: "/foo2",
        expanded: true,
        visibilityByColumn: [false, true],
      },
    ],
    expanded: true,
    derivedFields: {
      addTopicKeyboardFocusIndex: -1,
      expanded: true,
      id: "Some-Group_0",
      isShownInList: true,
      keyboardFocusIndex: -1,
      prefixesByColumn: DEFAULT_GROUP_PREFIXES_BY_COLUMN,
      hasFeatureColumn: true,
    },
  },
];

const { focusData } = updateFocusIndexesAndGetFocusData(TOPIC_GROUPS);
const visibilityCombinationsToToggleOff = [[true, false], [true, true], [false, true]];
const availableNamespacesByColumn = [["ns1", "ns2"], ["ns2", "ns3"]];
const sortedNamespaceDisplayVisibilityByColumn = [
  {
    displayVisibilityByColumn: [
      {
        available: true,
        badgeText: "B1",
        isParentVisible: true,
        visible: true,
      },
      undefined,
    ],
    keyboardFocusIndex: -1,
    namespace: "ns1",
  },
  {
    displayVisibilityByColumn: [
      {
        available: true,
        badgeText: "B1",
        isParentVisible: true,
        visible: true,
      },
      {
        available: true,
        badgeText: "B2",
        isParentVisible: true,
        visible: true,
      },
    ],
    keyboardFocusIndex: -1,
    namespace: "ns2",
  },
  {
    displayVisibilityByColumn: [
      undefined,
      {
        available: true,
        badgeText: "B2",
        isParentVisible: true,
        visible: true,
      },
    ],
    keyboardFocusIndex: -1,
    namespace: "ns3",
  },
];

function getGroupMappedData(topicGroup: TopicGroupType) {
  return {
    ...omit(topicGroup, "derivedFields"),
    items: compact(topicGroup.items).map((item) => omit(item, "derivedFields")),
  };
}

describe("getOnTopicGroupsChangeDataByKeyboardOp", () => {
  describe("group operations", () => {
    it("expands a group", () => {
      const topicGroups = set(cloneDeep(TOPIC_GROUPS), "[0].expanded", false);
      const result = getOnTopicGroupsChangeDataByKeyboardOp({
        focusItemOp: FOCUS_ITEM_OPS.ArrowRight,
        topicGroups,
        focusData,
        focusIndex: 0,
        isShiftKeyPressed: false,
      });
      expect(result).toEqual({ focusType: "GROUP", newValue: true, objectPath: "[0].expanded" });
    });

    it("collapses a group", () => {
      const result = getOnTopicGroupsChangeDataByKeyboardOp({
        focusItemOp: FOCUS_ITEM_OPS.ArrowLeft,
        topicGroups: cloneDeep(TOPIC_GROUPS),
        focusData,
        focusIndex: 0,
        isShiftKeyPressed: false,
      });
      expect(result).toEqual({ focusType: "GROUP", newValue: false, objectPath: "[0].expanded" });
    });

    it("does not collapse a group when filter text is not empty", () => {
      const topicGroups = set(cloneDeep(TOPIC_GROUPS), "[0].derivedFields.filterText", "someText");
      const result = getOnTopicGroupsChangeDataByKeyboardOp({
        focusItemOp: FOCUS_ITEM_OPS.ArrowLeft,
        topicGroups,
        focusData,
        focusIndex: 0,
        isShiftKeyPressed: false,
      });
      expect(result).toEqual(undefined);
    });

    it("deletes a group", () => {
      const result = getOnTopicGroupsChangeDataByKeyboardOp({
        focusItemOp: FOCUS_ITEM_OPS.Backspace,
        topicGroups: cloneDeep(TOPIC_GROUPS),
        focusData,
        focusIndex: 0,
        isShiftKeyPressed: false,
      });
      expect(result).toEqual({
        focusType: "GROUP",
        newValue: undefined,
        objectPath: "[0]",
        unhandledFocusItemOp: "Backspace",
      });
    });

    it("toggles the group visibility on", () => {
      const topicGroups = set(cloneDeep(TOPIC_GROUPS), "[0].visibilityByColumn", [false, false]);
      const result = getOnTopicGroupsChangeDataByKeyboardOp({
        focusItemOp: FOCUS_ITEM_OPS.Enter,
        topicGroups,
        focusData,
        focusIndex: 0,
        isShiftKeyPressed: false,
      });
      expect(result).toEqual({ focusType: "GROUP", newValue: [true, true], objectPath: "[0].visibilityByColumn" });
    });

    it("toggles the group visibility off", () => {
      visibilityCombinationsToToggleOff.forEach((visibilityByColumn) => {
        const topicGroups = set(cloneDeep(TOPIC_GROUPS), "[0].visibilityByColumn", visibilityByColumn);
        const result = getOnTopicGroupsChangeDataByKeyboardOp({
          focusItemOp: FOCUS_ITEM_OPS.Enter,
          topicGroups,
          focusData,
          focusIndex: 0,
          isShiftKeyPressed: false,
        });
        expect(result).toEqual({ focusType: "GROUP", newValue: [false, false], objectPath: "[0].visibilityByColumn" });
      });
    });

    it("toggles all topics' visibility on under the group", () => {
      const topicGroups = set(cloneDeep(TOPIC_GROUPS), "[0].visibilityByColumn", [false, false]);
      const result = getOnTopicGroupsChangeDataByKeyboardOp({
        focusItemOp: FOCUS_ITEM_OPS.Enter,
        topicGroups,
        focusData,
        focusIndex: 0,
        isShiftKeyPressed: true,
      });
      // $FlowFixMe, the returned result type should be TopicGroupType
      expect(getGroupMappedData(result.newValue)).toEqual({
        displayName: "Some Group",
        expanded: true,
        items: [
          { topicName: "/foo1", visibilityByColumn: [true, true], expanded: true },
          { topicName: "/foo2", visibilityByColumn: [true, true], expanded: true },
        ],
        visibilityByColumn: [true, true],
      });
    });

    it("toggles all topics' visibility off under the group", () => {
      visibilityCombinationsToToggleOff.forEach((visibilityByColumn) => {
        const topicGroups = set(cloneDeep(TOPIC_GROUPS), "[0].visibilityByColumn", visibilityByColumn);
        const result = getOnTopicGroupsChangeDataByKeyboardOp({
          focusItemOp: FOCUS_ITEM_OPS.Enter,
          topicGroups,
          focusData,
          focusIndex: 0,
          isShiftKeyPressed: true,
        });
        // $FlowFixMe, the returned result type should be TopicGroupType
        expect(getGroupMappedData(result.newValue)).toEqual({
          displayName: "Some Group",
          expanded: true,
          items: [
            { topicName: "/foo1", visibilityByColumn: [false, false], expanded: true },
            { topicName: "/foo2", visibilityByColumn: [false, false], expanded: true },
          ],
          visibilityByColumn: [false, false],
        });
      });
    });

    it("handles new groups", () => {
      const result = getOnTopicGroupsChangeDataByKeyboardOp({
        focusItemOp: FOCUS_ITEM_OPS.Enter,
        topicGroups: cloneDeep(TOPIC_GROUPS),
        focusData,
        focusIndex: 4,
        isShiftKeyPressed: false,
      });
      expect(result).toEqual({ focusType: "NEW_GROUP", objectPath: "", unhandledFocusItemOp: "Enter" });
    });
  });

  describe("topic operations", () => {
    it("expands a topic", () => {
      const topicGroups = set(cloneDeep(TOPIC_GROUPS), "[0].items[0].expanded", false);
      const result = getOnTopicGroupsChangeDataByKeyboardOp({
        focusItemOp: FOCUS_ITEM_OPS.ArrowRight,
        topicGroups,
        focusData,
        focusIndex: 1,
        isShiftKeyPressed: false,
      });
      expect(result).toEqual({ focusType: "TOPIC", newValue: true, objectPath: "[0].items.[0].expanded" });
    });

    it("collapses a topic", () => {
      const topicGroups = set(cloneDeep(TOPIC_GROUPS), "[0].items[0].expanded", true);
      const result = getOnTopicGroupsChangeDataByKeyboardOp({
        focusItemOp: FOCUS_ITEM_OPS.ArrowLeft,
        topicGroups,
        focusData,
        focusIndex: 1,
        isShiftKeyPressed: false,
      });
      expect(result).toEqual({ focusType: "TOPIC", newValue: false, objectPath: "[0].items.[0].expanded" });
    });

    it("deletes a topic", () => {
      const result = getOnTopicGroupsChangeDataByKeyboardOp({
        focusItemOp: FOCUS_ITEM_OPS.Backspace,
        topicGroups: cloneDeep(TOPIC_GROUPS),
        focusData,
        focusIndex: 1,
        isShiftKeyPressed: false,
      });
      expect(result).toEqual({
        focusType: "TOPIC",
        newValue: undefined,
        objectPath: "[0].items.[0]",
        unhandledFocusItemOp: "Backspace",
      });
    });

    it("handles new topic", () => {
      const result = getOnTopicGroupsChangeDataByKeyboardOp({
        focusItemOp: FOCUS_ITEM_OPS.Enter,
        topicGroups: cloneDeep(TOPIC_GROUPS),
        focusData,
        focusIndex: 3,
        isShiftKeyPressed: false,
      });
      expect(result).toEqual({ focusType: "NEW_TOPIC", objectPath: "[0].items", unhandledFocusItemOp: "Enter" });
    });

    it("toggles the topic visibility on", () => {
      const topicGroups = set(cloneDeep(TOPIC_GROUPS), "[0].items[0].visibilityByColumn", [false, false]);
      const result = getOnTopicGroupsChangeDataByKeyboardOp({
        focusItemOp: FOCUS_ITEM_OPS.Enter,
        topicGroups,
        focusData,
        focusIndex: 1,
        isShiftKeyPressed: false,
      });
      expect(result).toEqual({
        focusType: "TOPIC",
        newValue: [true, true],
        objectPath: "[0].items.[0].visibilityByColumn",
      });
    });

    it("toggles the topic visibility off", () => {
      visibilityCombinationsToToggleOff.forEach((visibilityByColumn) => {
        const topicGroups = set(cloneDeep(TOPIC_GROUPS), "[0].items[0].visibilityByColumn", visibilityByColumn);
        const result = getOnTopicGroupsChangeDataByKeyboardOp({
          focusItemOp: FOCUS_ITEM_OPS.Enter,
          topicGroups,
          focusData,
          focusIndex: 1,
          isShiftKeyPressed: false,
        });
        expect(result).toEqual({
          focusType: "TOPIC",
          newValue: [false, false],
          objectPath: "[0].items.[0].visibilityByColumn",
        });
      });
    });

    it("uses keyboard (Shift + Enter) to toggle all namespaces' visibility", () => {
      [
        {
          visibilityByColumn: [false, false],
          selectedNamespacesByColumn: [undefined, undefined],
          expected: {
            expanded: true,
            selectedNamespacesByColumn: [["ns1", "ns2"], ["ns2", "ns3"]],
            topicName: "/foo1",
            visibilityByColumn: [true, true],
          },
        },
        {
          visibilityByColumn: [false, true],
          selectedNamespacesByColumn: [undefined, undefined],
          expected: {
            expanded: true,
            selectedNamespacesByColumn: [[], []],
            topicName: "/foo1",
            visibilityByColumn: [false, false],
          },
        },
        {
          visibilityByColumn: [true, true],
          selectedNamespacesByColumn: [undefined, undefined],
          expected: {
            expanded: true,
            selectedNamespacesByColumn: [[], []],
            topicName: "/foo1",
            visibilityByColumn: [false, false],
          },
        },
        {
          visibilityByColumn: [false, false],
          selectedNamespacesByColumn: [["ns1"], undefined],
          expected: {
            expanded: true,
            selectedNamespacesByColumn: [["ns1", "ns2"], ["ns2", "ns3"]],
            topicName: "/foo1",
            visibilityByColumn: [true, true],
          },
        },
        {
          visibilityByColumn: [true, false],
          selectedNamespacesByColumn: [["ns1", "ns2"], ["ns2", "ns3"]],
          expected: {
            expanded: true,
            selectedNamespacesByColumn: [[], []],
            topicName: "/foo1",
            visibilityByColumn: [false, false],
          },
        },
        {
          visibilityByColumn: [true, true],
          selectedNamespacesByColumn: [undefined, ["ns2", "ns3"]],
          expected: {
            expanded: true,
            selectedNamespacesByColumn: [[], []],
            topicName: "/foo1",
            visibilityByColumn: [false, false],
          },
        },
      ].forEach(({ visibilityByColumn, selectedNamespacesByColumn, expected }) => {
        const topicGroups = set(
          cloneDeep(TOPIC_GROUPS),
          "[0].items[0].selectedNamespacesByColumn",
          selectedNamespacesByColumn
        );
        set(topicGroups, "[0].items[0].visibilityByColumn", visibilityByColumn);
        set(
          topicGroups,
          "[0].items[0].derivedFields.sortedNamespaceDisplayVisibilityByColumn",
          sortedNamespaceDisplayVisibilityByColumn
        );
        set(topicGroups, "[0].items[0].derivedFields.availableNamespacesByColumn", availableNamespacesByColumn);

        const updatedTopicGroupsWithFocusData = updateFocusIndexesAndGetFocusData(topicGroups);
        const result = getOnTopicGroupsChangeDataByKeyboardOp({
          focusItemOp: FOCUS_ITEM_OPS.Enter,
          topicGroups: updatedTopicGroupsWithFocusData.topicGroups,
          focusData: updatedTopicGroupsWithFocusData.focusData,
          focusIndex: 1,
          isShiftKeyPressed: true,
        });
        expect(omit(result?.newValue, "derivedFields")).toEqual(expected);
      });
    });

    it("toggles all namespaces' visibility (check keyboardToggleNamespace tests for more details)", () => {
      [
        { selectedNamespacesByColumn: [undefined, undefined], namespace: "ns2", expected: [["ns1"], ["ns3"]] },
        { selectedNamespacesByColumn: [undefined, ["ns2", "ns3"]], namespace: "ns2", expected: [["ns1"], ["ns3"]] },
        {
          selectedNamespacesByColumn: [undefined, ["ns3", "ns5"]],
          namespace: "ns2",
          expected: [["ns1"], ["ns3", "ns5"]],
        },
        {
          selectedNamespacesByColumn: [["ns1", "ns2"], undefined],
          namespace: "ns2",
          expected: [["ns1"], ["ns3"]],
        },
        {
          selectedNamespacesByColumn: [["ns1", "ns2"], ["ns2", "ns3"]],
          namespace: "ns2",
          expected: [["ns1"], ["ns3"]],
        },
        {
          selectedNamespacesByColumn: [["ns1", "ns2"], ["ns3"]],
          namespace: "ns2",
          expected: [["ns1"], ["ns3"]],
        },
        {
          selectedNamespacesByColumn: [["ns1"], undefined],
          namespace: "ns2",
          expected: [["ns1", "ns2"], undefined],
        },
        {
          selectedNamespacesByColumn: [["ns1"], ["ns3"]],
          namespace: "ns2",
          expected: [["ns1", "ns2"], ["ns2", "ns3"]],
        },
        {
          selectedNamespacesByColumn: [["ns1"], ["ns2", "ns3", "ns5"]],
          namespace: "ns2",
          expected: [["ns1", "ns2"], ["ns2", "ns3", "ns5"]],
        },
      ].forEach(({ selectedNamespacesByColumn, namespace, expected }) => {
        const topicGroups = set(
          cloneDeep(TOPIC_GROUPS),
          "[0].items[0].selectedNamespacesByColumn",
          selectedNamespacesByColumn
        );
        set(topicGroups, "[0].items[0].selectedNamespacesByColumn", selectedNamespacesByColumn);
        set(
          topicGroups,
          "[0].items[0].derivedFields.sortedNamespaceDisplayVisibilityByColumn",
          sortedNamespaceDisplayVisibilityByColumn
        );
        set(topicGroups, "[0].items[0].derivedFields.availableNamespacesByColumn", availableNamespacesByColumn);

        const updatedTopicGroupsWithFocusData = updateFocusIndexesAndGetFocusData(topicGroups);
        const result = getOnTopicGroupsChangeDataByKeyboardOp({
          focusItemOp: FOCUS_ITEM_OPS.Enter,
          topicGroups: updatedTopicGroupsWithFocusData.topicGroups,
          focusData: updatedTopicGroupsWithFocusData.focusData,
          focusIndex: 3, // row for `ns2`
          isShiftKeyPressed: false,
        });
        expect(result).toEqual({
          focusType: "NAMESPACE",
          newValue: expected,
          objectPath: "[0].items.[0].selectedNamespacesByColumn",
        });
      });
    });
  });

  describe("error handling", () => {
    it("throws error for unsupported focusType", () => {
      const incorrectFocusData = cloneDeep(focusData);
      // $FlowFixMe overwrite flow for testing
      incorrectFocusData[0].focusType = "unsupportedFocusType";
      expect(() =>
        getOnTopicGroupsChangeDataByKeyboardOp({
          focusItemOp: FOCUS_ITEM_OPS.ArrowRight,
          topicGroups: cloneDeep(TOPIC_GROUPS),
          focusData: incorrectFocusData,
          focusIndex: 0,
          isShiftKeyPressed: false,
        })
      ).toThrow();
    });

    it("throws error when focusIndex does not map to focusDataItem", () => {
      expect(() =>
        getOnTopicGroupsChangeDataByKeyboardOp({
          focusItemOp: FOCUS_ITEM_OPS.ArrowRight,
          topicGroups: cloneDeep(TOPIC_GROUPS),
          focusData,
          focusIndex: 200,
          isShiftKeyPressed: false,
        })
      ).toThrow();
    });

    it("throws error when not able to get topicGroup by objectPath", () => {
      const incorrectFocusData = cloneDeep(focusData);
      incorrectFocusData[0].objectPath = "incorrectObjectPath";
      expect(() =>
        getOnTopicGroupsChangeDataByKeyboardOp({
          focusItemOp: FOCUS_ITEM_OPS.ArrowRight,
          topicGroups: cloneDeep(TOPIC_GROUPS),
          focusData: incorrectFocusData,
          focusIndex: 0,
          isShiftKeyPressed: false,
        })
      ).toThrow();
    });

    it("throws error when not able to get topic by objectPath", () => {
      const incorrectFocusData = cloneDeep(focusData);
      incorrectFocusData[1].objectPath = "incorrectObjectPath";
      expect(() =>
        getOnTopicGroupsChangeDataByKeyboardOp({
          focusItemOp: FOCUS_ITEM_OPS.Enter,
          topicGroups: cloneDeep(TOPIC_GROUPS),
          focusData: incorrectFocusData,
          focusIndex: 1,
          isShiftKeyPressed: false,
        })
      ).toThrow();
    });

    it("throws error when not able to get namespaces by objectPath", () => {
      const topicGroups = set(
        cloneDeep(TOPIC_GROUPS),
        "[0].items[0].derivedFields.sortedNamespaceDisplayVisibilityByColumn",
        sortedNamespaceDisplayVisibilityByColumn
      );
      set(topicGroups, "[0].items[0].derivedFields.availableNamespacesByColumn", availableNamespacesByColumn);

      const updatedTopicGroupsWithFocusData = updateFocusIndexesAndGetFocusData(topicGroups);

      const incorrectFocusData = updatedTopicGroupsWithFocusData.focusData;
      incorrectFocusData[2].objectPath = "incorrectObjectPath";
      expect(() =>
        getOnTopicGroupsChangeDataByKeyboardOp({
          focusItemOp: FOCUS_ITEM_OPS.Enter,
          topicGroups: updatedTopicGroupsWithFocusData.topicGroups,
          focusData: incorrectFocusData,
          focusIndex: 2,
          isShiftKeyPressed: false,
        })
      ).toThrow();
    });
  });
});
