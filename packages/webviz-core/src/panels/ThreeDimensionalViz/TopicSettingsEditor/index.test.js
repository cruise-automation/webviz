// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { getTopicSettings } from ".";
import { setHooks, resetHooksToDefault } from "webviz-core/src/loadWebviz";
import type { Topic } from "webviz-core/src/players/types";

describe("getTopicSettings", () => {
  afterEach(() => {
    resetHooksToDefault();
  });

  it("returns empty object by default", () => {
    expect(getTopicSettings({ name: "foo", datatype: "Foo" }, undefined)).toEqual({});
  });

  it("returns given settings", () => {
    expect(getTopicSettings({ name: "foo", datatype: "Foo" }, { setting1: "setting!" })).toEqual({
      setting1: "setting!",
    });
  });

  it("merges with default settings", () => {
    setHooks({
      perPanelHooks() {
        return {
          ThreeDimensionalViz: {
            getDefaultTopicSettings({ name, datatype }: Topic, settings: {}) {
              if (datatype === "Foo") {
                return { setting1: "default!" };
              }
            },
          },
        };
      },
    });
    expect(getTopicSettings({ name: "foo", datatype: "Foo" }, { setting2: "setting!" })).toEqual({
      setting1: "default!",
      setting2: "setting!",
    });
  });

  it("prefers custom settings", () => {
    setHooks({
      perPanelHooks() {
        return {
          ThreeDimensionalViz: {
            getDefaultTopicSettings({ name, datatype }: Topic, settings: {}) {
              if (datatype === "Foo") {
                return { setting1: "default!" };
              }
            },
          },
        };
      },
    });
    expect(getTopicSettings({ name: "foo", datatype: "Foo" }, { setting1: "setting!" })).toEqual({
      setting1: "setting!",
    });
  });
});
