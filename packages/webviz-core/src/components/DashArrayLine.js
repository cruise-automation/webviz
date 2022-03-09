// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";

import Dimensions from "webviz-core/src/components/Dimensions";

const DashArrayLine = (props: { borderDash?: [number, number], borderWidth: number, stroke: string }) => {
  const { borderDash, borderWidth, stroke, ...rest } = props;

  // We use an SVG to draw the line preview so we can use custom line dashing.
  // (CSS border-style only supports fixed presets of solid, dotted, and dashed).
  return (
    <Dimensions>
      {({ width, height }) => {
        const y = height / 2 + (borderWidth % 2) / 2; // Align to nearest pixel so the line is crisp
        return (
          <div {...rest} style={{ ...(rest: any)?.style, width, height }}>
            <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height}>
              <path
                d={`M0,${y} L${width},${y}`}
                stroke={stroke}
                strokeWidth={borderWidth}
                strokeDasharray={borderDash || undefined}
              />
            </svg>
          </div>
        );
      }}
    </Dimensions>
  );
};

export default DashArrayLine;
