// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import addAutoFormatOnSaveToNodePlaygroundConfig from "webviz-core/migrations/frozenMigrations/2020.09.30.19:06:38.addAutoFormatOnSaveToNodePlaygroundConfig.js";

describe("addAutoFormatOnSaveToNodePlaygroundConfig", () => {
  it("sets the autoFormatOnSave config key to true if it doesn't exist", () => {
    expect(
      addAutoFormatOnSaveToNodePlaygroundConfig({
        savedProps: {
          "NodePlayground!3bqkn1w": {
            selectedNodeId: undefined,
            vimMode: false,
          },
        },
      })
    ).toEqual({
      savedProps: {
        "NodePlayground!3bqkn1w": {
          selectedNodeId: undefined,
          vimMode: false,
          autoFormatOnSave: true,
        },
      },
    });
  });

  it("does not set autoFormatOnSave config key to true if it is false", () => {
    expect(
      addAutoFormatOnSaveToNodePlaygroundConfig({
        savedProps: {
          "NodePlayground!3bqkn1w": {
            selectedNodeId: undefined,
            vimMode: false,
            autoFormatOnSave: false,
          },
        },
      })
    ).toEqual({
      savedProps: {
        "NodePlayground!3bqkn1w": {
          selectedNodeId: undefined,
          vimMode: false,
          autoFormatOnSave: false,
        },
      },
    });
  });
});
