// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import React, { useMemo, useState } from "react";
import styled, { css } from "styled-components";

import Dimensions from "webviz-core/src/components/Dimensions";
import HoverBar from "webviz-core/src/components/HoverBar";
import { useMessagePipeline } from "webviz-core/src/components/MessagePipeline";
import { colors } from "webviz-core/src/util/sharedStyleConstants";
import { toSec } from "webviz-core/src/util/time";

const sharedTickStyles = css`
  position: absolute;
  left: 0px;
  width: 0px;
  height: 0px;

  border-left: 5px solid transparent;
  border-right: 5px solid transparent;

  margin-left: -6px; /* -6px seems to line up better than -5px */
`;

const TopTick = styled.div`
  ${sharedTickStyles}
  top: 8px;
  border-top: 5px solid ${colors.YELLOW};
`;

const BottomTick = styled.div`
  ${sharedTickStyles}
  bottom: 8px;
  border-bottom: 5px solid ${colors.YELLOW};
`;

function getStartAndEndTime({ playerState: { activeData } }) {
  if (activeData == null) {
    return { startTime: undefined, endTime: undefined };
  }
  return { startTime: activeData.startTime, endTime: activeData.endTime };
}

type Props = {|
  componentId: string,
|};

export default React.memo<Props>(function PlaybackBarHoverTicks({ componentId }: Props) {
  const { startTime, endTime } = useMessagePipeline(getStartAndEndTime);
  const [width, setWidth] = useState<?number>();
  const [height, setHeight] = useState<?number>();

  const scaleBounds = useMemo(() => {
    if (width == null || height == null || startTime == null || endTime == null) {
      return null;
    }
    return {
      // HoverBar takes a ref to avoid rerendering (and avoid needing to rerender) when the bounds
      // change in charts that scroll at playback speed.
      current: [
        {
          id: componentId,
          min: 0,
          max: toSec(endTime) - toSec(startTime),
          axes: "xAxes",
          minAlongAxis: 0,
          maxAlongAxis: width,
        },
        {
          id: componentId,
          min: 0,
          max: height,
          axes: "yAxes",
          minAlongAxis: 0,
          maxAlongAxis: height,
        },
      ],
    };
  }, [width, height, startTime, endTime, componentId]);

  return (
    <>
      <Dimensions>
        {({ width: newWidth, height: newHeight }) => {
          // Just using the Dimensions for a side-effect instead of rendering children makes
          // memoizing scaleBounds to preserve identity a bit simpler.
          if (width !== newWidth) {
            setWidth(newWidth);
          }
          if (height !== newHeight) {
            setHeight(newHeight);
          }
          return null;
        }}
      </Dimensions>
      {scaleBounds && (
        <HoverBar componentId={componentId} scaleBounds={scaleBounds} isTimestampScale>
          <TopTick />
          <BottomTick />
        </HoverBar>
      )}
    </>
  );
});
