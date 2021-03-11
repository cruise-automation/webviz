// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import React, { useState } from "react";

import Slider from "webviz-core/src/RobotStyles/Slider";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

const SliderExample = () => {
  const [values, setValues] = useState([2]);
  return <Slider values={values} min={0} max={5} step={0.1} onChange={setValues} />;
};

const SingleThumbSliderExample = () => {
  const [values, setValues] = useState([2, 4]);
  return (
    <Slider
      values={values}
      colors={[colors.BLUEL1, colors.YELLOWL1, colors.BLUEL1]}
      min={0}
      max={5}
      step={0.1}
      onChange={setValues}
      showThumbLabelOnHover
    />
  );
};

storiesOf("<Slider-RobotStyles>", module).add("examples", () => (
  <div style={{ padding: 24 }}>
    <p>Basic example</p>
    <SliderExample />
    <p>Single thumb example</p>
    <SingleThumbSliderExample />
  </div>
));
