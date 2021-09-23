// @flow
//
//  Copyright (c) 2021-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import React from "react";
import { getTrackBackground } from "react-range";
import styled from "styled-components";

import { useSelectionRange, useSetSelectionRange } from "webviz-core/src/components/PlaybackSelection/context";
import { colorToAlpha } from "webviz-core/src/components/SegmentedControl";
import Slider from "webviz-core/src/RobotStyles/Slider";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

const SContainer = styled.div`
  display: flex;
  align-items: stretch;
  height: 12px;
  width: 100%;
  position: absolute;
  top: 4px;
  left: 0px;
  z-index: 3;
  visibility: hidden;

  > * {
    visibility: visible;
  }
`;

const STrack = styled.div.attrs((props) => ({
  style: {
    background: getTrackBackground({
      values: props.values,
      colors: [colorToAlpha(colors.TEAL1, 0.5), colorToAlpha(colors.TEAL1, 1), colorToAlpha(colors.TEAL1, 0.5)],
      min: props.min,
      max: props.max,
    }),
  },
}))`
  height: 16px;
  width: 100%;
  border-radius: 0;
`;

const SThumb = styled.div`
  height: calc(100% - 2px);
  width: 5px;
  border-radius: 2px;
  background-color: ${colors.LIGHT1};
  box-shadow: 0 0 0 3px transparent;

  &:hover {
    box-shadow: 0 0 0 5px ${colorToAlpha(colors.LIGHT1, 0.1)};
  }
`;

const MIN_MAX_RANGE = [0, 1];
const MIN_DISTANCE = 0.001;

const SelectionSlider = () => {
  const selectionRange = useSelectionRange();
  const setSelectionRange = useSetSelectionRange();

  // Ensure there's at least MIN_DISTANCE between start and end
  // without causing either one to be outside of the MIN_MAX_RANGE.
  const onFinalChange = React.useCallback(([start, end]) => {
    const duration = Math.max(end - start, MIN_DISTANCE);
    const newEnd = Math.min(start + duration, MIN_MAX_RANGE[1]);
    const newStart = newEnd - duration;
    return setSelectionRange({ start: newStart, end: newEnd });
  }, [setSelectionRange]);

  // Always render the container so we can render something where the slider should go when
  // there isn't a selection.
  return (
    <SContainer id="selection_slider">
      {selectionRange ? (
        <Slider
          values={[selectionRange.start, selectionRange.end]}
          min={MIN_MAX_RANGE[0]}
          max={MIN_MAX_RANGE[1]}
          step={MIN_DISTANCE}
          overrides={{ Track: STrack, Thumb: SThumb }}
          onChange={([start, end]) => setSelectionRange({ start, end })}
          onFinalChange={onFinalChange}
        />
      ) : null}
    </SContainer>
  );
};
export default SelectionSlider;
