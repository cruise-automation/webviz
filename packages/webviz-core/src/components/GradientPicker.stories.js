// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import React, { useRef, useLayoutEffect, useState } from "react";
import { withScreenshot } from "storybook-chrome-screenshot";

import GradientPicker from "./GradientPicker";

function Story({
  openOnMount,
  changeMinColorAfterMount,
  changeMaxColorAfterMount,
  initialMinColor,
  initialMaxColor,
}: {
  openOnMount?: boolean,
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
      if (changeMinColorAfterMount && containerRef.current) {
        containerRef.current.querySelectorAll('[data-test="ColorPicker"]')[0].click();
      }
      if (changeMaxColorAfterMount && containerRef.current) {
        containerRef.current.querySelectorAll('[data-test="ColorPicker"]')[1].click();
      }
    },
    [changeMaxColorAfterMount, changeMinColorAfterMount]
  );

  useLayoutEffect(
    () => {
      setImmediate(() => {
        if (changeMinColorAfterMount && minRef.current) {
          const slider = minRef.current.getPickrForTesting().getRoot().hue.slider;
          const rect = slider.getBoundingClientRect();
          slider.dispatchEvent(
            new MouseEvent("mousedown", {
              clientX: rect.left + rect.width * 0.2,
              clientY: rect.top + rect.height / 2,
            })
          );
        }
        if (changeMaxColorAfterMount && maxRef.current) {
          const slider = maxRef.current.getPickrForTesting().getRoot().hue.slider;
          const rect = slider.getBoundingClientRect();
          slider.dispatchEvent(
            new MouseEvent("mousedown", {
              clientX: rect.left + rect.width * 0.8,
              clientY: rect.top + rect.height / 2,
            })
          );
        }
      });
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
  .addDecorator(withScreenshot({ viewport: { width: 585, height: 500 } }))
  .add("basic", () => <Story initialMinColor="#ff0000" initialMaxColor="#0000ff" />)
  .add("change min color", () => <Story initialMinColor="#ff0000" initialMaxColor="#0000ff" changeMinColorAfterMount />)
  .add("change max color", () => (
    <Story initialMinColor="#ff0000" initialMaxColor="#0000ff" changeMaxColorAfterMount />
  ));
