// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { migrate3DPanelSavedProps } from "webviz-core/migrations/frozenMigrations/2020.05.06.00:00:03.migrate3DPanel";

type ThreeDimensionalVizConfig = any;

// Convert `r,g,b,a` string to {r, g, b, a}.
function parseColorSetting(rgba: ?string) {
  const [r = 255, g = 255, b = 255, a = 1] = (rgba || "")
    .split(",")
    .map(parseFloat)
    .map((x) => (isNaN(x) ? undefined : x));
  return { r: r / 255, g: g / 255, b: b / 255, a };
}
export function migrateColors(settingsByKey: any): any {
  const newSettings = {};
  for (const [key, val] of Object.entries(settingsByKey)) {
    if (val != null) {
      // $FlowFixMe The settings may have color or overrideColor fields.
      const oldColor: ?string = val.color || val.overrideColor; // Migrate color to overrideColor for pose settings.
      if (oldColor) {
        newSettings[key] = { overrideColor: parseColorSetting(oldColor) };
      } else if (val.colorMode) {
        // Migrate minColor, maxColor and flatColor for point cloud settings.
        // $FlowFixMe valid field
        const flatColor: ?string = val.colorMode.flatColor;
        // $FlowFixMe valid field
        const minColor: ?string = val.colorMode.minColor;
        // $FlowFixMe valid field
        const maxColor: ?string = val.colorMode.maxColor;
        if (flatColor) {
          newSettings[key] = {
            ...val,
            colorMode: { ...val.colorMode, flatColor: parseColorSetting(flatColor) },
          };
        } else if (minColor && maxColor) {
          newSettings[key] = {
            ...val,
            colorMode: {
              ...val.colorMode,
              minColor: parseColorSetting(minColor),
              maxColor: parseColorSetting(maxColor),
            },
          };
        } else {
          newSettings[key] = val;
        }
      } else {
        newSettings[key] = val;
      }
    }
  }
  return newSettings;
}

export function migrate3DPanelColorSettings(config: ThreeDimensionalVizConfig): ThreeDimensionalVizConfig {
  return {
    ...config,
    settingsByKey: migrateColors(config.settingsByKey || {}),
  };
}

export default migrate3DPanelSavedProps(migrate3DPanelColorSettings);
