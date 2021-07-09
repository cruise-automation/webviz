// @flow
//
//  Copyright (c) 2021-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { type DebugStats } from "./types";
import useDebugStats from "./useDebugStats";

type Props = {
  setDebugStats: (DebugStats) => void,
};

export default function Collector(props: Props) {
  const { setDebugStats } = props;
  const debugStats = useDebugStats();
  if (debugStats) {
    setDebugStats(debugStats);
  }
  return null;
}
