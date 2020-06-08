// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import React from "react";

import { Sparkline, type SparklinePoint } from "webviz-core/src/components/Sparkline";

const points: SparklinePoint[] = [
  { value: 5, timestamp: 10 },
  { value: 50, timestamp: 30 },
  { value: 30, timestamp: 60 },
  { value: 100, timestamp: 100 },
];

const props = {
  points,
  width: 300,
  height: 100,
  timeRange: 100,
  nowStamp: 100,
};

storiesOf("<Sparkline>", module)
  .add("standard", () => {
    return (
      <div style={{ padding: 8 }}>
        <Sparkline {...props} />
      </div>
    );
  })
  .add("with explicit maximum of 200", () => {
    return (
      <div style={{ padding: 8 }}>
        <Sparkline {...props} maximum={200} />
      </div>
    );
  });
