// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { migrate3DPanelPointCloudHexColors } from "webviz-core/migrations/frozenMigrations/2020.06.01.11:34:51.migrate3DPanelPointCloudHexColors";

describe("migrate3DPanelPointCloudHexColors", () => {
  it("converts hex colors to rgba numbers ", () => {
    expect(
      migrate3DPanelPointCloudHexColors(
        ({
          checkedKeys: [],
          topicSettings: {},
        }: any)
      ).topicSettings
    ).toEqual({});

    expect(
      migrate3DPanelPointCloudHexColors(
        ({
          checkedKeys: [],
          topicSettings: {
            "/foo": {
              colorMode: {
                mode: "flat",
                flatColor: "#c51d1dff",
              },
            },
            "/foo1": {
              colorMode: {
                mode: "flat",
                flatColor: "1,1,1,1",
              },
            },
            "/bar": {
              colorMode: {
                mode: "gradient",
                colorField: "z",
                minColor: "#FF008E",
                maxColor: "#5FD621",
              },
            },
            "/bar1": {
              colorMode: {
                mode: "gradient",
                colorField: "z",
                minColor: undefined,
                maxColor: "#5FD621",
              },
            },
            "/bar2": {
              colorMode: {
                mode: "gradient",
                colorField: "z",
                minColor: "#66e29896",
                maxColor: "2,2,2,2",
              },
            },
          },
        }: any)
      ).topicSettings
    ).toEqual({
      "/foo": { colorMode: { flatColor: "197,29,29,1", mode: "flat" } },
      "/foo1": { colorMode: { flatColor: "1,1,1,1", mode: "flat" } },
      "/bar": { colorMode: { colorField: "z", maxColor: "95,214,33,1", minColor: "255,0,142,1", mode: "gradient" } },
      "/bar1": { colorMode: { colorField: "z", maxColor: "95,214,33,1", minColor: undefined, mode: "gradient" } },
      "/bar2": {
        colorMode: {
          colorField: "z",
          maxColor: "2,2,2,2",
          minColor: "102,226,152,0.5882352941176471",
          mode: "gradient",
        },
      },
    });
  });
});
