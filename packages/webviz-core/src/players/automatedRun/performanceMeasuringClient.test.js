// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import performanceMeasuringClient, { PerformanceMeasuringClient } from "./performanceMeasuringClient";

describe("performanceMeasuringClient", () => {
  it("resetInTests correctly resets all state", () => {
    const clientWithDefaults = new PerformanceMeasuringClient();
    // Set all the keys in the performance measuring client to some weird value.
    for (const key of Object.keys(performanceMeasuringClient)) {
      // $FlowFixMe
      performanceMeasuringClient[key] = "fake";
    }
    performanceMeasuringClient.resetInTests();

    const toObject = (client) => {
      const result = {};
      Object.keys(client).forEach((key) => {
        // $FlowFixMe
        result[key] = client[key];
      });
      return result;
    };
    expect(toObject(performanceMeasuringClient)).toEqual(toObject(clientWithDefaults));
  });

  it("Generates stats", () => {
    performanceMeasuringClient.shouldMeasureIdbTimes = true;

    performanceMeasuringClient.start({ bagLengthMs: 1000 });
    performanceMeasuringClient.markFrameRenderStart();
    performanceMeasuringClient.markFrameRenderEnd();
    performanceMeasuringClient.markTotalFrameStart();
    performanceMeasuringClient.markTotalFrameEnd();
    performanceMeasuringClient.markIdbReadStart();
    performanceMeasuringClient.markIdbReadEnd({ message: { topic: "foo" } });

    const stats = performanceMeasuringClient.finish();
    expect(stats).toMatchObject({
      bagLengthMs: expect.any(Number),
      speed: expect.any(Number),
      msPerFrame: expect.any(Number),
      frameRenderCount: expect.any(Number),

      playbackTimeMs: expect.any(Number),
      averageRenderMs: expect.any(Number),
      averageFrameTimeMs: expect.any(Number),
    });

    performanceMeasuringClient.resetInTests();
  });
});
