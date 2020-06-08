// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import React, { useRef, useLayoutEffect, useState } from "react";
import TestUtils from "react-dom/test-utils";

import GradientPicker from "./GradientPicker";

function Story({
  changeMinColorAfterMount,
  changeMaxColorAfterMount,
  initialMinColor,
  initialMaxColor,
}: {
  changeMinColorAfterMount?: boolean,
  changeMaxColorAfterMount?: boolean,
  initialMinColor?: string,
  initialMaxColor?: string,
}) {
  const containerRef = useRef<?HTMLDivElement>();
  const minRef = useRef();
  const maxRef = useRef();
  const [minColor, setMinColor] = useState(initialMinColor || "");
  const [maxColor, setMaxColor] = useState(initialMaxColor || "");

  useLayoutEffect(
    () => {
      if (!(changeMinColorAfterMount || changeMaxColorAfterMount)) {
        return;
      }
      const [minTriggerEl, maxTriggerEl] = document.querySelectorAll(".rc-color-picker-trigger");

      if (changeMinColorAfterMount) {
        minTriggerEl.click();
        setImmediate(() => {
          const hexInput = ((document.querySelector(".rc-color-picker-panel-params-hex"): any): HTMLInputElement);
          hexInput.value = "#d2ff03";
          TestUtils.Simulate.change(hexInput);
          TestUtils.Simulate.blur(hexInput);
        });
      } else {
        maxTriggerEl.click();
        setImmediate(() => {
          const hexInput = ((document.querySelector(".rc-color-picker-panel-params-hex"): any): HTMLInputElement);
          hexInput.value = "#c501ff";
          TestUtils.Simulate.change(hexInput);
          TestUtils.Simulate.blur(hexInput);
        });
      }
    },
    [changeMaxColorAfterMount, changeMinColorAfterMount]
  );

  return (
    <div ref={containerRef} style={{ width: "400px", padding: "100px" }}>
      <GradientPicker
        minColorRefForTesting={minRef}
        maxColorRefForTesting={maxRef}
        minColor={minColor}
        maxColor={maxColor}
        onChange={({ minColor: newMinColor, maxColor: newMaxColor }) => {
          setMinColor(newMinColor);
          setMaxColor(newMaxColor);
        }}
      />
    </div>
  );
}

storiesOf("<GradientPicker>", module)
  .addParameters({
    screenshot: {
      viewport: { width: 585, height: 500 },
    },
  })
  .add("basic", () => <Story initialMinColor="255,0,0,1" initialMaxColor="0,0,255,1" />)
  .add("change min color", () => (
    <Story initialMinColor="255,0,0,1" initialMaxColor="0,0,255,1" changeMinColorAfterMount />
  ))
  .add("change max color", () => (
    <Story initialMinColor="255,0,0,1" initialMaxColor="0,0,255,1" changeMaxColorAfterMount />
  ));
