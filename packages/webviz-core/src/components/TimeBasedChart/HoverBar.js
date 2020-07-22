// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";
import { useSelector } from "react-redux";
import styled from "styled-components";

import { getChartPx, type ScaleBounds } from "webviz-core/src/components/ReactChartjs/zoomAndPanHelpers";

const SWrapper = styled.div`
  top: 0;
  bottom: 0;
  position: absolute;
  pointer-events: none;
  will-change: transform;
  // "visibility" and "transform" are set by JS, but outside of React.
  visibility: hidden;
`;

type Props = {|
  children?: React.Node,
  componentId: string,
  // We don't need to (and shouldn't) rerender when the scale-bounds changes under the cursor -- the
  // bar should stay under the mouse. Only rerender when the mouse moves (using useSelector).
  scaleBounds: { current: ?$ReadOnlyArray<ScaleBounds> },
  isTimestampScale: boolean,
|};

function hideBar(wrapper) {
  if (wrapper.style.visibility !== "hidden") {
    wrapper.style.visibility = "hidden";
  }
}

function showBar(wrapper, position) {
  wrapper.style.visibility = "visible";
  wrapper.style.transform = `translateX(${position}px)`;
}

function shouldShowBar(hoverValue, componentId, isTimestampScale) {
  if (hoverValue == null) {
    return false;
  }
  if (hoverValue.type === "PLAYBACK_SECONDS" && isTimestampScale) {
    // Always show playback-time hover values for timestamp-based charts.
    return true;
  }
  // Otherwise just show a hover bar when hovering over the panel itself.
  return hoverValue.componentId === componentId;
}

export default React.memo<Props>(({ children, componentId, isTimestampScale, scaleBounds }: Props) => {
  const wrapper = React.useRef<?HTMLDivElement>(null);
  const hoverValue = useSelector((state) => state.hoverValue);

  const xBounds = scaleBounds.current && scaleBounds.current.find(({ axes }) => axes === "xAxes");

  // We avoid putting the visibility and transforms into react state to try to keep updates snappy.
  // Mouse interactions are frequent, and adding/removing the bar from the DOM would slow things
  // down a lot more than mutating the style props does.
  if (wrapper.current != null) {
    const { current } = wrapper;
    if (xBounds == null || hoverValue == null) {
      hideBar(current);
    }
    if (shouldShowBar(hoverValue, componentId, isTimestampScale)) {
      const position = getChartPx(xBounds, hoverValue.value);
      if (position == null) {
        hideBar(current);
      } else {
        showBar(current, position);
      }
    }
  }

  return <SWrapper ref={wrapper}>{children}</SWrapper>;
});
