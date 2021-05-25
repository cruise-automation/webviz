// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";
import styled from "styled-components";

import { useHoverValue } from "./context";
import { getChartPx, type ScaleBounds } from "webviz-core/src/components/ReactChartjs/zoomAndPanHelpers";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

export const SBar = styled.div.attrs(({ xAxisIsPlaybackTime }) => ({
  style: {
    background: xAxisIsPlaybackTime ? `${colors.YELLOW} padding-box` : `${colors.BLUE} padding-box`,
    // Non-timestamp plot hover bars have no triangles (indicating click-to-seek) at top/bottom.
    borderWidth: xAxisIsPlaybackTime ? "4px" : "0px 4px",
  },
}))`
  position: absolute;
  top: 0;
  bottom: 0;
  width: 9px;
  margin-left: -4px;
  display: block;
  border-style: solid;
  border-color: ${colors.YELLOW} transparent;
`;

const SWrapper = styled.div`
  top: 0;
  bottom: 0;
  position: absolute;
  pointer-events: none;
  will-change: transform;
  // "visibility" and "transform" are set by JS, but outside of React.
  visibility: hidden;
`;

// Given the scale bounds, returns the distance from the top of the chart canvas to the top of the actual chart area,
// and the height of the chart area.
export function getChartTopAndHeight(scaleBounds: ?$ReadOnlyArray<ScaleBounds>): ?{ topPx: number, heightPx: number } {
  const firstYScale = scaleBounds && scaleBounds.find(({ axes }) => axes === "yAxes");
  if (firstYScale == null) {
    return;
  }
  const topPx = Math.min(firstYScale.minAlongAxis, firstYScale.maxAlongAxis);
  const bottomPx = Math.max(firstYScale.minAlongAxis, firstYScale.maxAlongAxis);
  const heightPx = bottomPx - topPx;
  return { topPx, heightPx };
}

type Props = {|
  children?: React.Node,
  componentId: string,
  // We don't need to (and shouldn't) rerender when the scale-bounds changes under the cursor -- the
  // bar should stay under the mouse. Only rerender when the mouse moves.
  scaleBounds: { current: ?$ReadOnlyArray<ScaleBounds> },
  isTimestampScale: boolean,
|};

function hideBar(wrapper) {
  if (wrapper.style.visibility !== "hidden") {
    wrapper.style.visibility = "hidden";
  }
}

function showBar(wrapper, position, topPx, heightPx) {
  if (wrapper.style.visibility !== "visible") {
    wrapper.style.visibility = "visible";
  }
  const transform = `translateX(${position}px)`;
  if (transform !== wrapper.style.transform) {
    wrapper.style.transform = transform;
  }

  const top = `${topPx}px`;
  const height = `${heightPx}px`;
  if (top !== wrapper.style.top) {
    wrapper.style.top = top;
  }
  if (height !== wrapper.style.height) {
    wrapper.style.height = height;
  }
}

export default React.memo<Props>(({ children, componentId, isTimestampScale, scaleBounds }: Props) => {
  const wrapper = React.useRef<?HTMLDivElement>(null);
  const hoverValue = useHoverValue({ componentId, isTimestampScale });

  const xBounds = scaleBounds.current && scaleBounds.current.find(({ axes }) => axes === "xAxes");

  // We avoid putting the visibility and transforms into react state to try to keep updates snappy.
  // Mouse interactions are frequent, and adding/removing the bar from the DOM would slow things
  // down a lot more than mutating the style props does.
  if (wrapper.current != null) {
    const { current } = wrapper;
    if (xBounds == null || hoverValue == null) {
      hideBar(current);
    }
    if (hoverValue != null) {
      const position = getChartPx(xBounds, hoverValue.value);
      const topAndHeight = getChartTopAndHeight(scaleBounds.current);
      if (position == null || topAndHeight == null) {
        hideBar(current);
      } else {
        showBar(current, position, topAndHeight.topPx, topAndHeight.heightPx);
      }
    }
  }

  return <SWrapper ref={wrapper}>{children}</SWrapper>;
});
