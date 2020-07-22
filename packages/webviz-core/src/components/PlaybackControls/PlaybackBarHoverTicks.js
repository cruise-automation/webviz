// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import React, { useMemo, useState } from "react";
import Dimensions from "react-container-dimensions";
import styled, { css } from "styled-components";

import { useMessagePipeline } from "webviz-core/src/components/MessagePipeline";
import HoverBar from "webviz-core/src/components/TimeBasedChart/HoverBar";
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
  border-top: 5px solid #f7be00;
`;

const BottomTick = styled.div`
  ${sharedTickStyles}
  bottom: 8px;
  border-bottom: 5px solid #f7be00;
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

export default React.memo<Props>(({ componentId }: Props) => {
  const { startTime, endTime } = useMessagePipeline(getStartAndEndTime);
  const [width, setWidth] = useState<?number>();

  const scaleBounds = useMemo(
    () => {
      if (width == null || startTime == null || endTime == null) {
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
        ],
      };
    },
    [width, startTime, endTime, componentId]
  );

  return (
    <>
      <Dimensions>
        {({ width: newWidth }) => {
          // Just using the Dimensions for a side-effect instead of rendering children makes
          // memoizing scaleBounds to preserve identity a bit simpler.
          if (width !== newWidth) {
            setWidth(newWidth);
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
