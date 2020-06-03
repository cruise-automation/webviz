// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import migratePanels from "webviz-core/migrations";
import { CURRENT_LAYOUT_VERSION } from "webviz-core/migrations/constants";

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
      playbackConfig: {
        messageOrder: "receiveTime",
        speed: 0.2,
      },
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
      playbackConfig: {
        messageOrder: "receiveTime",
        speed: 0.2,
      },
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
      playbackConfig: {
        messageOrder: "receiveTime",
        speed: 0.2,
      },
      version: CURRENT_LAYOUT_VERSION,
    });
  });

  it("migrates from 3D panel to current", () => {
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
            topicSettings: {
              "/foo": {
                colorMode: {
                  mode: "flat",
                  flatColor: "#c51d1dff",
                },
              },
              "/bar": {
                colorMode: {
                  mode: "gradient",
                  colorField: "z",
                  minColor: "#66e29896",
                  maxColor: "#FF008E",
                  minValue: 0,
                  maxValue: 6,
                },
              },
            },
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
          "name:Topic",
          "name_2:Topic",
        ],
        topicSettings: {
          "/bar": {
            colorMode: {
              colorField: "z",
              maxColor: "255,0,142,1",
              minColor: "102,226,152,0.5882352941176471",
              mode: "gradient",
              minValue: 0,
              maxValue: 6,
            },
          },
          "/foo": {
            colorMode: {
              flatColor: "197,29,29,1",
              mode: "flat",
            },
          },
        },
        expandedKeys: [],
      },
    });
  });
});
