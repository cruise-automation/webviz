// @flow
//
//  Copyright (c) 2021-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { isEqual } from "lodash";
import React from "react";

import { type DebugStats } from "./types";
import Renderer from "webviz-core/src/panels/ThreeDimensionalViz/DebugStats/Renderer";
import inScreenshotTests from "webviz-core/src/stories/inScreenshotTests";
import { useChangeDetector } from "webviz-core/src/util/hooks";
import Rpc from "webviz-core/src/util/Rpc";

type Props = {
  debug: boolean,
  rpc: Rpc,
};

export default function DebugStatsOverlayRpc(props: Props) {
  const { rpc, debug } = props;

  const [debugStats, setDebugStats] = React.useState();

  const updateDebugStats = React.useCallback((newStats: DebugStats) => {
    setDebugStats((oldStats) => (isEqual(oldStats, newStats) ? oldStats : newStats));
  }, [setDebugStats]);

  if (useChangeDetector([rpc], true)) {
    rpc.receive("updateDebugStats", updateDebugStats);
  }

  if (process.env.NODE_ENV === "production" || inScreenshotTests() || !debug || !debugStats) {
    return null;
  }

  return <Renderer debugStats={debugStats} />;
}
