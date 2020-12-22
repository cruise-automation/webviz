// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import React from "react";

import { UnconnectedPlaybackPerformance, type UnconnectedPlaybackPerformanceProps } from ".";
import type { PlayerStateActiveData } from "webviz-core/src/players/types";

const defaultActiveData: PlayerStateActiveData = {
  messages: [],
  bobjects: [],
  startTime: { sec: 0, nsec: 0 },
  currentTime: { sec: 10, nsec: 0 },
  endTime: { sec: 20, nsec: 0 },
  isPlaying: true,
  speed: 5.0,
  messageOrder: "receiveTime",
  lastSeekTime: 0,
  topics: [],
  datatypes: {},
  parsedMessageDefinitionsByTopic: {},
  playerWarnings: {},
  totalBytesReceived: 0,
};

function Example({ states }: { states: UnconnectedPlaybackPerformanceProps[] }) {
  const [state, setState] = React.useState(states);
  React.useEffect(() => {
    if (state.length > 1) {
      setState(state.slice(1));
    }
  }, [state]);
  return <UnconnectedPlaybackPerformance {...state[0]} />;
}

storiesOf("<PlaybackPerformance>", module).add("simple example", () => {
  const states = [
    {
      timestamp: 1000,
      activeData: defaultActiveData,
    },
    {
      timestamp: 1500,
      activeData: {
        ...defaultActiveData,
        totalBytesReceived: 1e6,
        currentTime: { sec: 11, nsec: 0 },
      },
    },
  ];
  return <Example states={states} />;
});
