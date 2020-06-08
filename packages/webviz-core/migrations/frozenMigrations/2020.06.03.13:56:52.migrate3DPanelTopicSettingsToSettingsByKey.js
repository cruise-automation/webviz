// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { migrate3DPanelSavedProps } from "webviz-core/migrations/frozenMigrations/2020.05.06.00:00:03.migrate3DPanel";

type ThreeDimensionalVizConfig = any;

export function migrate3DPanelTopicSettingsToSettingsByKey({
  topicSettings = {},
  ...rest
}: ThreeDimensionalVizConfig): ThreeDimensionalVizConfig {
  const settingsByKey = {};
  for (const [topicName, settings] of Object.entries(topicSettings)) {
    if (topicName.startsWith("/")) {
      settingsByKey[`t:${topicName}`] = settings;
    } else {
      settingsByKey[topicName] = settings;
    }
  }

  return {
    ...rest,
    settingsByKey,
  };
}

export default migrate3DPanelSavedProps(migrate3DPanelTopicSettingsToSettingsByKey);
