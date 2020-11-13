// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { last, sumBy } from "lodash";
import * as React from "react";
import { hot } from "react-hot-loader/root";

import helpContent from "./index.help.md";
import Flex from "webviz-core/src/components/Flex";
import { useMessagePipeline } from "webviz-core/src/components/MessagePipeline";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import { Sparkline, type SparklinePoint } from "webviz-core/src/components/Sparkline";
import type { PlayerStateActiveData } from "webviz-core/src/players/types";
import { subtractTimes, toSec } from "webviz-core/src/util/time";

const TIME_RANGE = 5000;

type PlaybackPerformanceItemProps = {|
  points: SparklinePoint[],
  maximum: number,
  decimalPlaces: number,
  children: React.Node,
|};

function PlaybackPerformanceItem(props: PlaybackPerformanceItemProps): React.Node {
  return (
    <div style={{ margin: 8 }}>
      <Sparkline points={props.points} maximum={props.maximum} width={100} height={30} timeRange={TIME_RANGE} />
      <div style={{ display: "inline-block", marginLeft: 12, verticalAlign: "middle" }}>
        {(last(props.points) || { value: 0 }).value.toFixed(props.decimalPlaces)}
        {props.children}
        <div style={{ color: "#aaa" }}>
          {(sumBy(props.points, "value") / props.points.length).toFixed(props.decimalPlaces)} avg
        </div>
      </div>
    </div>
  );
}

export type UnconnectedPlaybackPerformanceProps = $ReadOnly<{|
  timestamp: number,
  activeData: ?PlayerStateActiveData,
|}>;

// Exported for stories
export function UnconnectedPlaybackPerformance({ timestamp, activeData }: UnconnectedPlaybackPerformanceProps) {
  const playbackInfo = React.useRef<?{| timestamp: number, activeData: PlayerStateActiveData |}>();
  const lastPlaybackInfo = playbackInfo.current;
  if (activeData && (!playbackInfo.current || playbackInfo.current.activeData !== activeData)) {
    playbackInfo.current = { timestamp, activeData };
  }

  const perfPoints = React.useRef<{|
    speed: SparklinePoint[],
    framerate: SparklinePoint[],
    bagTimeMs: SparklinePoint[],
    megabitsPerSecond: SparklinePoint[],
  |}>({
    speed: [],
    framerate: [],
    bagTimeMs: [],
    megabitsPerSecond: [],
  });

  if (activeData && playbackInfo.current && lastPlaybackInfo && lastPlaybackInfo.activeData !== activeData) {
    const renderTimeMs = timestamp - lastPlaybackInfo.timestamp;
    if (
      lastPlaybackInfo.activeData.isPlaying &&
      activeData.isPlaying &&
      lastPlaybackInfo.activeData.lastSeekTime === activeData.lastSeekTime &&
      lastPlaybackInfo.activeData.currentTime !== activeData.currentTime
    ) {
      const bagTimeMs = toSec(subtractTimes(activeData.currentTime, lastPlaybackInfo.activeData.currentTime)) * 1000;
      perfPoints.current.speed.push({ value: bagTimeMs / renderTimeMs, timestamp });
      perfPoints.current.framerate.push({ value: 1000 / renderTimeMs, timestamp });
      perfPoints.current.bagTimeMs.push({ value: bagTimeMs, timestamp });
    }
    const newBytesReceived = activeData.totalBytesReceived - lastPlaybackInfo.activeData.totalBytesReceived;
    const newMegabitsReceived = (8 * newBytesReceived) / 1e6;
    const megabitsPerSecond = newMegabitsReceived / (renderTimeMs / 1000);
    perfPoints.current.megabitsPerSecond.push({ value: megabitsPerSecond, timestamp });
    for (const name in perfPoints.current) {
      const points = perfPoints.current[name];
      while (points[0] && points[0].timestamp < timestamp - TIME_RANGE) {
        points.shift();
      }
    }
  }

  return (
    <Flex col>
      <PanelToolbar floating helpContent={helpContent} />
      <Flex col wrap center start style={{ lineHeight: 1, whiteSpace: "nowrap" }}>
        <PlaybackPerformanceItem points={perfPoints.current.speed} maximum={1.6} decimalPlaces={2}>
          &times; realtime
        </PlaybackPerformanceItem>
        <PlaybackPerformanceItem points={perfPoints.current.framerate} maximum={30} decimalPlaces={1}>
          fps
        </PlaybackPerformanceItem>
        <PlaybackPerformanceItem points={perfPoints.current.bagTimeMs} maximum={300} decimalPlaces={0}>
          ms bag frame
        </PlaybackPerformanceItem>
        <PlaybackPerformanceItem points={perfPoints.current.megabitsPerSecond} maximum={100} decimalPlaces={1}>
          Mbps
        </PlaybackPerformanceItem>
      </Flex>
    </Flex>
  );
}

function PlaybackPerformance(): React.Node {
  const timestamp = Date.now();
  const activeData = useMessagePipeline(React.useCallback(({ playerState }) => playerState.activeData, []));
  return <UnconnectedPlaybackPerformance timestamp={timestamp} activeData={activeData} />;
}

PlaybackPerformance.panelType = "PlaybackPerformance";
PlaybackPerformance.defaultConfig = {};

export default hot(Panel<{}>(PlaybackPerformance));
