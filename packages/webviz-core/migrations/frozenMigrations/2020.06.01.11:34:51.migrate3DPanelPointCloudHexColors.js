// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import tinyColor from "tinycolor2";

import { migrate3DPanelSavedProps } from "webviz-core/migrations/frozenMigrations/2020.05.06.00:00:03.migrate3DPanel";

type ThreeDimensionalVizConfig = any;

function getRgbaColor(maybeHexColor: ?string): ?string {
  if (maybeHexColor && maybeHexColor.startsWith("#")) {
    const rgbaObj = tinyColor(maybeHexColor).toRgb();
    return `${rgbaObj.r},${rgbaObj.g},${rgbaObj.b},${rgbaObj.a}`;
  }
  return maybeHexColor;
}

export function migratePointCloudHexColorsToRgba(topicSettings: any): any {
  const newSettings = {};
  for (const [key, val] of Object.entries(topicSettings)) {
    if (val && val.colorMode) {
      // Migrate minColor, maxColor and flatColor from hex to r,g,b,a format
      // $FlowFixMe valid field
      const flatColor: ?string = val.colorMode.flatColor;
      // $FlowFixMe valid field
      const minColor: ?string = val.colorMode.minColor;
      // $FlowFixMe valid field
      const maxColor: ?string = val.colorMode.maxColor;
      if (flatColor) {
        newSettings[key] = { ...val, colorMode: { ...val.colorMode, flatColor: getRgbaColor(flatColor) } };
      } else {
        newSettings[key] = {
          ...val,
          colorMode: { ...val.colorMode, minColor: getRgbaColor(minColor), maxColor: getRgbaColor(maxColor) },
        };
      }
    } else {
      newSettings[key] = val;
    }
  }
  return newSettings;
}

export function migrate3DPanelPointCloudHexColors(config: ThreeDimensionalVizConfig): ThreeDimensionalVizConfig {
  return {
    ...config,
    topicSettings: migratePointCloudHexColorsToRgba(config.topicSettings || {}),
  };
}

export default migrate3DPanelSavedProps(migrate3DPanelPointCloudHexColors);
