// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { migrate3DPanelColorSettings } from "webviz-core/migrations/frozenMigrations/2020.06.26.17:40:24.migrate3DPanelColorSettings";

describe("migrate3DPanelColorSettings", () => {
  it("converts rgba string to rgba objects ", () => {
    expect(
      migrate3DPanelColorSettings(
        ({
          checkedKeys: [],
          settingsByKey: {},
        }: any)
      ).settingsByKey
    ).toEqual({});

    expect(
      migrate3DPanelColorSettings(
        ({
          checkedKeys: [],
          settingsByKey: {
            "/topic_with_no_change": { name: "foo" },
            "/topic_to_remove": undefined,
            "/foo": { colorMode: { flatColor: "197,29,29,1", mode: "flat" } },
            "/foo1": { colorMode: { flatColor: "1,1,1,1", mode: "flat" } },
            "/bar": {
              colorMode: { colorField: "z", maxColor: "95,214,33,1", minColor: "255,0,142,1", mode: "gradient" },
            },
            "/bar1": { colorMode: { colorField: "z", maxColor: "95,214,33,1", minColor: undefined, mode: "gradient" } },
            "/bar2": {
              colorMode: {
                colorField: "z",
                maxColor: "2,2,2,1",
                minColor: "102,226,152,0.5882352941176471",
                mode: "gradient",
                minValue: 1,
                maxValue: 100,
              },
            },
            "/bar3": {
              colorMode: {
                colorField: "z",
                minValue: 1,
                maxValue: 100,
                mode: "rainbow",
              },
            },
            "/foo2": { color: "100,100,100,1" },
            "/foo3": { overrideColor: "200,200,200,1" },
          },
        }: any)
      ).settingsByKey
    ).toEqual({
      "/bar": {
        colorMode: {
          colorField: "z",
          maxColor: { a: 1, b: 0.12941176470588237, g: 0.8392156862745098, r: 0.37254901960784315 },
          minColor: { a: 1, b: 0.5568627450980392, g: 0, r: 1 },
          mode: "gradient",
        },
      },
      "/bar1": { colorMode: { colorField: "z", maxColor: "95,214,33,1", minColor: undefined, mode: "gradient" } },
      "/bar2": {
        colorMode: {
          colorField: "z",
          maxColor: { a: 1, b: 0.00784313725490196, g: 0.00784313725490196, r: 0.00784313725490196 },
          maxValue: 100,
          minColor: { a: 0.5882352941176471, b: 0.596078431372549, g: 0.8862745098039215, r: 0.4 },
          minValue: 1,
          mode: "gradient",
        },
      },
      "/bar3": { colorMode: { colorField: "z", maxValue: 100, minValue: 1, mode: "rainbow" } },
      "/foo": {
        colorMode: {
          flatColor: { a: 1, b: 0.11372549019607843, g: 0.11372549019607843, r: 0.7725490196078432 },
          mode: "flat",
        },
      },
      "/foo1": {
        colorMode: {
          flatColor: { a: 1, b: 0.00392156862745098, g: 0.00392156862745098, r: 0.00392156862745098 },
          mode: "flat",
        },
      },
      "/foo2": { overrideColor: { a: 1, b: 0.39215686274509803, g: 0.39215686274509803, r: 0.39215686274509803 } },
      "/foo3": { overrideColor: { a: 1, b: 0.7843137254901961, g: 0.7843137254901961, r: 0.7843137254901961 } },
      "/topic_with_no_change": { name: "foo" },
    });
  });
});
