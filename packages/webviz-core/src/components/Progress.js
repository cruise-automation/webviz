// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";

import { colors } from "webviz-core/src/util/sharedStyleConstants";

type Props = {
  percent: number,
  color?: string,
  width?: number | string,
  height?: number,
  vertical?: boolean,
};

const Progress = (props: Props) => {
  const { percent, vertical, color = "black" } = props;
  const viewBoxWidth = vertical ? 1 : 100;
  const viewBoxHeight = vertical ? 100 : 1;
  const style = {};
  style.border = `solid ${colors.DARK3}`;
  style.borderWidth = "0 1px";
  const max = 100 - (percent || 0);

  const lineProps = {};

  if (vertical) {
    style.width = props.width || 10;
    style.height = "100%";
    lineProps.x1 = 0;
    lineProps.x2 = 0;
    lineProps.y1 = 100;
    lineProps.y2 = max;
  } else {
    style.height = props.height || 10;
    style.flex = "1 1 100%";
    lineProps.x1 = 0;
    lineProps.x2 = 100 - max;
    lineProps.y1 = 0;
    lineProps.y2 = 0;
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      style={style}
      version="1.1"
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}>
      <line {...lineProps} stroke={color} strokeWidth={2} />
    </svg>
  );
};

Progress.displayName = "Progress";

export default Progress;
