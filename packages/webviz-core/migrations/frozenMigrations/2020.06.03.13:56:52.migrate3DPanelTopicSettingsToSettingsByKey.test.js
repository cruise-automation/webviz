// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { migrate3DPanelTopicSettingsToSettingsByKey } from "webviz-core/migrations/frozenMigrations/2020.06.03.13:56:52.migrate3DPanelTopicSettingsToSettingsByKey";

describe("migrate3DPanelTopicSettingsToSettingsByKey", () => {
  it("migrates topicSettings to settingsByKey", () => {
    expect(migrate3DPanelTopicSettingsToSettingsByKey({ checkedKeys: [], topicSettings: {} })).toEqual({
      checkedKeys: [],
      settingsByKey: {},
    });
    expect(
      migrate3DPanelTopicSettingsToSettingsByKey({
        checkedKeys: [],
        topicSettings: {
          "/foo": { overrideColor: "1,1,1,1" },
          "/webviz_source_2/bar": { pointSize: 2 },
        },
      })
    ).toEqual({
      checkedKeys: [],
      settingsByKey: {
        "t:/foo": { overrideColor: "1,1,1,1" },
        "t:/webviz_source_2/bar": { pointSize: 2 },
      },
    });
  });
});
