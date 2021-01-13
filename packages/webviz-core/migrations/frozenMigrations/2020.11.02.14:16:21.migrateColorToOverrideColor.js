// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { migrate3DPanelSavedProps } from "webviz-core/migrations/frozenMigrations/2020.05.06.00:00:03.migrate3DPanel";

type ThreeDimensionalVizConfig = any;

function migrateColors(settingsByKey: any): any {
  const newSettingsByKey = { ...settingsByKey };
  for (const [key, val] of Object.entries(newSettingsByKey)) {
    if (val != null) {
      // Migrate color to overrideColor for pose settings.
      const oldColor: ?string = (val: any).color;
      if (oldColor) {
        const newSettings = { ...val, overrideColor: oldColor };
        delete newSettings.color;
        newSettingsByKey[key] = newSettings;
      }
    }
  }
  return newSettingsByKey;
}

export function migateColorToOverrideColor(config: ThreeDimensionalVizConfig): ThreeDimensionalVizConfig {
  return {
    ...config,
    settingsByKey: migrateColors(config.settingsByKey || {}),
  };
}

export default migrate3DPanelSavedProps(migateColorToOverrideColor);

// Remember to include migration in webviz-core/migrations/index.js
