// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import migratePanels from "./migratePanels";

describe("migratePanels", () => {
  it("migrates globalData to globalVariables", () => {
    const globalVariables = { some_global_data_var: 1 };
    const globalData = { some_other_var: 2 };
    let panelsState = {
      layout: "Foo!1",
      savedProps: {},
      globalVariables,
      globalData,
      linkedGlobalVariables: [],
      userNodes: {},
      playbackConfig: { speed: 0.2 },
    };

    // keep the old globalVariable value and delete globalData key
    expect(migratePanels(panelsState)).toEqual({
      globalVariables: {
        some_global_data_var: 1,
      },
      layout: "Foo!1",
      linkedGlobalVariables: [],
      savedProps: {},
      userNodes: {},
      playbackConfig: { speed: 0.2 },
    });

    panelsState = {
      layout: "Foo!1",
      savedProps: {},
      globalData,
      linkedGlobalVariables: [],
      userNodes: {},
      playbackConfig: { speed: 0.2 },
    };
    // create a new key globalVariable, assign the globalData value to it, and delete the globalData key
    // $FlowFixMe some old panelsState don't have globalVariables key
    expect(migratePanels(panelsState)).toEqual({
      globalVariables: {
        some_other_var: 2,
      },
      layout: "Foo!1",
      linkedGlobalVariables: [],
      savedProps: {},
      userNodes: {},
      playbackConfig: { speed: 0.2 },
    });
  });

  it("adds a playback config with speed", () => {
    expect(
      // $FlowFixMe some old panelsStates don't have a playbackConfig key
      migratePanels({
        savedProps: {},
        linkedGlobalVariables: [],
        globalVariables: {},
        layout: "",
        userNodes: {},
      }).playbackConfig
    ).toEqual({
      speed: 0.2,
    });
  });

  it("correctly defaults an empty playback config with appropriate speed", () => {
    expect(
      // $FlowFixMe some old panelsStates could have incorrect playbackConfig value
      migratePanels({
        savedProps: {},
        linkedGlobalVariables: [],
        globalVariables: {},
        layout: "",
        userNodes: {},
        playbackConfig: {},
      }).playbackConfig
    ).toEqual({
      speed: 0.2,
    });
  });
});
