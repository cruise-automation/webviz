// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { withState } from "@dump247/storybook-state";
import { action } from "@storybook/addon-actions";
import { storiesOf } from "@storybook/react";
import React from "react";
import styled from "styled-components";

import Slider from "webviz-core/src/components/Slider";

const StyledRange = styled.div`
  position: absolute;
  top: 40%;
  left: 0;
  background-color: #b3ecf9bd;
  height: 20%;
  width: ${(props) => (props.width || 0) * 100}%;
  border-radius: 2px;
`;

const StyledMarker = styled.div`
  background-color: white;
  position: absolute;
  height: 150%;
  border: 1px solid rgba(0, 0, 0, 0.3);
  width: 6px;
  top: -25%;
  left: ${(props) => (props.width || 0) * 100}%;
`;

const initialState = {
  value: 50,
  draggableValue: 25,
};

storiesOf("<Slider>", module)
  .add(
    "examples",
    withState(initialState, (store) => {
      const { state } = store;
      const logValue = action("onChange");
      const onChange = (key, value) => {
        logValue(value);
        store.set({ [key]: value });
      };
      return (
        <div style={{ margin: 50 }}>
          <p>standard (clickable)</p>
          <div style={{ backgroundColor: "pink", height: 30, width: 300 }}>
            <Slider min={10} max={200} onChange={(v) => onChange("value", v)} value={state.value} />
          </div>
          <p>no value</p>
          <div style={{ backgroundColor: "pink", height: 30, width: 300 }}>
            <Slider min={10} max={200} onChange={() => {}} value={null} />
          </div>
          <p>draggable</p>
          <div style={{ backgroundColor: "cornflowerblue", height: 20, width: 500 }}>
            <Slider
              draggable
              min={10}
              max={200}
              onChange={(v) => onChange("draggableValue", v)}
              value={state.draggableValue}
            />
          </div>
        </div>
      );
    })
  )
  .add(
    "custom renderer",
    withState(initialState, (store) => {
      const { state } = store;
      const logValue = action("onChange");
      const onChange = (key, value) => {
        logValue(value);
        store.set({ [key]: value });
      };

      return (
        <div style={{ margin: 50 }}>
          <p>Customize slider UI using renderSlider</p>
          <div style={{ backgroundColor: "cornflowerblue", height: 20, width: 500 }}>
            <Slider
              draggable
              min={10}
              max={200}
              onChange={(v) => onChange("draggableValue", v)}
              value={state.draggableValue}
              renderSlider={(width) => (
                <div>
                  <StyledRange width={width} />
                  <StyledMarker width={width} />
                </div>
              )}
            />
          </div>
        </div>
      );
    })
  );
