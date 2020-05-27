// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { CURRENT_LAYOUT_VERSION, THREE_DIMENSIONAL_SAVED_PROPS_VERSION } from "webviz-core/migrations/constants/index";
import migratePanels from "webviz-core/migrations/index";

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

  it("migrates from 3D panel checkedKeys -> current (TopicTree checkedKeys)", () => {
    expect(
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
          "name_2:(Uncategorized)",
        ],
        expandedKeys: [],
        savedPropsVersion: THREE_DIMENSIONAL_SAVED_PROPS_VERSION,
      },
    });
  });
});
