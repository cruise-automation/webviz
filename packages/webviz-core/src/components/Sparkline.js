// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { max } from "lodash";
import * as React from "react";

import AutoSizingCanvas from "webviz-core/src/components/AutoSizingCanvas";

export type SparklinePoint = {| value: number, timestamp: number |};

type SparklineProps = {|
  points: SparklinePoint[],
  width: number,
  height: number,
  timeRange: number,
  maximum?: number,
  nowStamp?: number, // Mostly for testing.
|};

function draw(
  points: SparklinePoint[],
  maximum: number,
  timeRange: number,
  nowStamp: number,
  context: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  const maxValue = Math.max(maximum, max(points.map(({ value }) => value)));
  context.clearRect(0, 0, width, height);
  context.beginPath();
  context.strokeStyle = "white";
  let first = true;
  for (const { value, timestamp } of points) {
    const x = ((timeRange + timestamp - nowStamp) / timeRange) * width;
    const y = (1 - value / maxValue) * height;
    if (first) {
      context.moveTo(x, y);
      first = false;
    } else {
      context.lineTo(x, y);
    }
  }
  context.stroke();
}

export function Sparkline(props: SparklineProps) {
  return (
    <div
      style={{
        display: "inline-block",
        verticalAlign: "-10px",
        backgroundColor: "#333",
        width: props.width,
        height: props.height,
      }}>
      <AutoSizingCanvas
        draw={(context: CanvasRenderingContext2D, width: number, height: number) => {
          draw(props.points, props.maximum || 0, props.timeRange, props.nowStamp || Date.now(), context, width, height);
        }}
      />
    </div>
  );
}
