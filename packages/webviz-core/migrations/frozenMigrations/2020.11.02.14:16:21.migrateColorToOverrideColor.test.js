// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { migateColorToOverrideColor } from "webviz-core/migrations/frozenMigrations/2020.11.02.14:16:21.migrateColorToOverrideColor.js";

describe("migateColorToOverrideColor", () => {
  it("uses overrideColor instead of color", () => {
    expect(
      migateColorToOverrideColor(
        ({
          checkedKeys: [],
          settingsByKey: {},
        }: any)
      ).settingsByKey
    ).toEqual({});

    expect(
      migateColorToOverrideColor(
        ({
          checkedKeys: [],
          settingsByKey: {
            "/topic_with_no_change": { name: "foo" },
            "/foo2": {
              name: "test",
              color: { a: 1, b: 0.39215686274509803, g: 0.39215686274509803, r: 0.39215686274509803 },
            },
            "/foo3": { overrideColor: { a: 1, b: 0.7843137254901961, g: 0.7843137254901961, r: 0.7843137254901961 } },
          },
        }: any)
      ).settingsByKey
    ).toEqual({
      "/topic_with_no_change": { name: "foo" },
      "/foo2": {
        name: "test",
        overrideColor: { a: 1, b: 0.39215686274509803, g: 0.39215686274509803, r: 0.39215686274509803 },
      },
      "/foo3": { overrideColor: { a: 1, b: 0.7843137254901961, g: 0.7843137254901961, r: 0.7843137254901961 } },
    });
  });
});
