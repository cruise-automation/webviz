// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { CURRENT_LAYOUT_VERSION, THREE_DIMENSIONAL_SAVED_PROPS_VERSION } from "webviz-core/migrations/constants/index";
import migratePanels from "webviz-core/migrations/index";

jest.mock("webviz-core/src/loadWebviz", () => ({
  getGlobalHooks: () => ({
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

describe("migratePanels", () => {
  it("migrates globalData to globalVariables", () => {
    const globalVariables = { some_global_data_var: 1 };
    const globalData = { some_other_var: 2 };
    let panelsState = {
      layout: "Foo!1",
      savedProps: {},
      globalVariables,
      globalData,
      linkedGlobalVariables: [],
      userNodes: {},
      playbackConfig: { speed: 0.2 },
    };

    // keep the old globalVariable value and delete globalData key
    // $FlowFixMe some old playbackConfigs don't have messageOrder keys.
    expect(migratePanels(panelsState)).toEqual({
      globalVariables: {
        some_global_data_var: 1,
      },
      layout: "Foo!1",
      linkedGlobalVariables: [],
      savedProps: {},
      userNodes: {},
      playbackConfig: { speed: 0.2, messageOrder: "receiveTime" },
      version: CURRENT_LAYOUT_VERSION,
    });

    panelsState = {
      layout: "Foo!1",
      savedProps: {},
      globalData,
      linkedGlobalVariables: [],
      userNodes: {},
      playbackConfig: { speed: 0.2 },
    };
    // create a new key globalVariable, assign the globalData value to it, and delete the globalData key
    // $FlowFixMe some old panelsState don't have globalVariables key
    expect(migratePanels(panelsState)).toEqual({
      globalVariables: { some_other_var: 2 },
      layout: "Foo!1",
      linkedGlobalVariables: [],
      savedProps: {},
      userNodes: {},
      playbackConfig: { speed: 0.2, messageOrder: "receiveTime" },
      version: CURRENT_LAYOUT_VERSION,
    });
  });

  it("adds a playback config with speed", () => {
    expect(
      // $FlowFixMe some old panelsStates don't have a playbackConfig key
      migratePanels({
        savedProps: {},
        linkedGlobalVariables: [],
        globalVariables: {},
        layout: "",
        userNodes: {},
      }).playbackConfig
    ).toEqual({ messageOrder: "receiveTime", speed: 0.2 });
  });

  it("correctly defaults an empty playback config with appropriate speed", () => {
    expect(
      // $FlowFixMe some old panelsStates could have incorrect playbackConfig value
      migratePanels({
        savedProps: {},
        linkedGlobalVariables: [],
        globalVariables: {},
        layout: "",
        userNodes: {},
        playbackConfig: {},
      }).playbackConfig
    ).toEqual({ messageOrder: "receiveTime", speed: 0.2 });
  });
  it("migrates 3D panel topic tree settings to topic groups", () => {
    const checkedNodes = [
      "t:/topic_a",
      "/topic_b",
      "/webviz_bag_2/topic_b",
      "t:/topic_c",
      "ns:/topic_c:ns1",
      "/webviz_bag_2/topic_c",
      "ns:/webviz_bag_2/topic_c:ns1",
      "ns:/webviz_bag_2/topic_c:ns2",
      "Nested Group",
      "name:Deeply Nested Group",
      "name:(Uncategorized)",
      "x:ExtA.a",
      "x:ExtB.b",
    ];
    expect(
      // $FlowFixMe some old panelsStates could have incorrect playbackConfig value
      migratePanels({
        savedProps: { "3D Panel!1": { checkedNodes } },
        linkedGlobalVariables: [],
        globalVariables: {},
        layout: "3D Panel!1",
        userNodes: {},
        playbackConfig: {},
      }).savedProps
    ).toEqual({
      "3D Panel!1": {
        checkedKeys: [
          "t:/topic_a",
          "t:/topic_b",
          "t:/webviz_source_2/topic_b",
          "t:/topic_c",
          "ns:/topic_c:ns1",
          "t:/webviz_source_2/topic_c",
          "ns:/webviz_source_2/topic_c:ns1",
          "ns:/webviz_source_2/topic_c:ns2",
          "name:Nested Group",
          "name:Deeply Nested Group",
          "name:(Uncategorized)",
          "ns:/metadata:ExtA.a",
          "ns:/metadata:ExtB.b",
        ],
        expandedKeys: [],
        savedPropsVersion: THREE_DIMENSIONAL_SAVED_PROPS_VERSION,
      },
    });
  });

  it("migrates from 3D panel checkedKeys -> current (TopicTreeV2 checkedKeys)", () => {
    expect(
      // $FlowFixMe some old panelsStates could have incorrect playbackConfig value
      migratePanels({
        savedProps: {
          "3D Panel!1": {
            checkedNodes: [
              "t:/foo",
              "/bar",
              "/webviz_source_2/foo",
              "/webviz_source_2/bar",
              "/webviz_source_2/topic_a",
              "/webviz_source_2/topic_c",
              "x:ExtA.a",
              "x:ExtB.b",
              "(Uncategorized)",
            ],
          },
        },
        linkedGlobalVariables: [],
        globalVariables: {},
        layout: "3D Panel!1",
        userNodes: {},
        playbackConfig: {},
      }).savedProps
    ).toEqual({
      "3D Panel!1": {
        checkedKeys: [
          "t:/foo",
          "t:/bar",
          "t:/webviz_source_2/foo",
          "t:/webviz_source_2/bar",
          "t:/webviz_source_2/topic_a",
          "t:/webviz_source_2/topic_c",
          "ns:/metadata:ExtA.a",
          "ns:/metadata:ExtB.b",
          "name:(Uncategorized)",
        ],
        expandedKeys: [],
        savedPropsVersion: THREE_DIMENSIONAL_SAVED_PROPS_VERSION,
      },
    });
  });
});
