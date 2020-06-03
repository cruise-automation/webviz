// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import addDefaultPlaybackConfig from "webviz-core/migrations/frozenMigrations/2020.06.02.11:27:59.addDefaultPlaybackConfig";

describe("addDefaultPlaybackConfig", () => {
  it("leaves the config alone when there are values already", () => {
    const config = {
      playbackConfig: {
        speed: 1.0,
        messageOrder: "headerStamp",
      },
    };
    expect(addDefaultPlaybackConfig(config)).toEqual(config);
  });

  it("adds a messageOrder when one is missing", () => {
    const before = {
      playbackConfig: {
        speed: 1.0,
      },
    };
    expect(addDefaultPlaybackConfig(before)).toEqual({
      playbackConfig: {
        speed: 1.0,
        messageOrder: "receiveTime",
      },
    });
  });
});
