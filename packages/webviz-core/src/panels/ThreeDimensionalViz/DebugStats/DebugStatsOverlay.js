// @flow
//
//  Copyright (c) 2021-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";

import Renderer from "webviz-core/src/panels/ThreeDimensionalViz/DebugStats/Renderer";
import useDebugStats from "webviz-core/src/panels/ThreeDimensionalViz/DebugStats/useDebugStats";
import inScreenshotTests from "webviz-core/src/stories/inScreenshotTests";

const DebugStatsRenderer = () => {
  const debugStats = useDebugStats();
  if (!debugStats) {
    return null;
  }
  return <Renderer debugStats={debugStats} />;
};

export default function DebugStatsOverlay({ debug }: { debug: boolean }) {
  if (process.env.NODE_ENV === "production" || inScreenshotTests() || !debug) {
    return null;
  }

  return <DebugStatsRenderer />;
}
