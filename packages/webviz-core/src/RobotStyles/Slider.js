// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import * as React from "react";
import { Range, getTrackBackground } from "react-range";
import styled from "styled-components";

import { colorToAlpha } from "webviz-core/src/components/SegmentedControl";
import * as theme from "webviz-core/src/util/sharedStyleConstants";

type TrackProps = {
  values: number[],
  min: number,
  max: number,
  colors?: string[],
};

export const styles = {
  Track: styled.div`
    height: 4px;
    width: 100%;
    max-width: 300px;
    background: ${(props: TrackProps) =>
      getTrackBackground({
        values: props.values,
        colors: props.colors || [theme.colors.BLUEL1, colorToAlpha(theme.colors.LIGHT, 0.1)],
        min: props.min,
        max: props.max,
      })};
    border-radius: ${theme.rounded.PILL};
  `,
  Thumb: styled.div`
    height: 12px;
    width: 12px;
    border-radius: ${theme.rounded.CIRCLE};
    background-color: ${theme.colors.BLUE1};
    box-shadow: 0 0 0 3px transparent;

    &:hover {
      box-shadow: 0 0 0 5px ${colorToAlpha(theme.colors.BLUE1, 0.1)};
    }

    &:focus,
    &:active {
      box-shadow: 0 0 0 5px ${colorToAlpha(theme.colors.BLUE1, 0.2)};
    }
  `,
  ThumbLabel: styled.div`
    position: absolute;
    top: -30px;
    color: ${theme.colors.LIGHT};
    font-weight: 500;
    font-size: 12px;
    line-height: 130%;
    padding: 6px 8px;
    border-radius: 4px;
    background-color: ${theme.colors.BLUE1};
    left: 50%;
    transform: translateX(-50%);
  `,
};

type SliderProps = {
  values: number[],
  min: number,
  max: number,
  step: number,
  singleThumb?: boolean,
  colors?: string[],
  onChange: (values: number[]) => void,
  overrides?: {
    Track?: React.ComponentType<any>,
    Thumb?: React.ComponentType<any>,
    ThumbLabel?: React.ComponentType<any>,
  },
  showThumbLabelOnHover?: boolean,
};

const Slider = (rangeProps: SliderProps) => {
  const { overrides = {}, values, colors, singleThumb, onChange, showThumbLabelOnHover, ...restProps } = rangeProps;
  const [firstValue, ...restValues] = values;
  const Track = overrides.Track || styles.Track;
  const Thumb = overrides.Thumb || styles.Thumb;
  const ThumbLabel = overrides.ThumbLabel || styles.ThumbLabel;
  return (
    <Range
      direction="to right"
      values={singleThumb ? [firstValue] : values}
      onChange={([newFirstValue, ...restNewValues]) =>
        onChange(singleThumb ? [newFirstValue, ...restValues] : [newFirstValue, ...restNewValues])
      }
      renderTrack={({ props, children }) => (
        <Track
          values={singleThumb ? values.sort() : values}
          min={rangeProps.min}
          max={rangeProps.max}
          colors={colors}
          {...props}>
          {children}
        </Track>
      )}
      renderThumb={({ props, index, isDragged }) => (
        <Thumb {...props}>{showThumbLabelOnHover && isDragged && <ThumbLabel>{values[index]}</ThumbLabel>}</Thumb>
      )}
      {...restProps}
    />
  );
};

export default Slider;
