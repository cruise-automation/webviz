// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import { noop } from "lodash";
import React from "react";

import { SliderWithTicks } from "webviz-core/src/components/SliderWithTicks";

storiesOf("<SliderWithTicks>", module).add("examples", () => {
  return (
    <div style={{ width: 300 }}>
      <SliderWithTicks sliderProps={{ min: 0, max: 10, step: 1 }} value={3} onChange={noop} />
      <SliderWithTicks sliderProps={{ min: 0, max: 1, step: 0.1 }} value={0.1} onChange={noop} />
      <SliderWithTicks sliderProps={{ min: 0, max: 10000, step: 2000 }} value={590} onChange={noop} />
    </div>
  );
});
