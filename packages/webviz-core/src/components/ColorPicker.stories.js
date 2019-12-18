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

import ColorPicker from "./ColorPicker";

function Story({
  openOnMount,
  changeColorAfterMount,
  initialColor,
}: {
  openOnMount?: boolean,
  changeColorAfterMount?: boolean,
  initialColor?: string,
}) {
  const pickerRef = useRef();
  const containerRef = useRef<?HTMLDivElement>();
  const [color, setColor] = useState(initialColor || "");

  useLayoutEffect(
    () => {
      if (openOnMount && containerRef.current) {
        // $FlowFixMe - flow upgrade will allow function calls in optional chains
        containerRef.current.querySelector('[data-test="ColorPicker"]').click();
      }
    },
    [openOnMount]
  );

  useLayoutEffect(
    () => {
      setImmediate(() => {
        if (changeColorAfterMount && pickerRef.current) {
          const palette = pickerRef.current.getPickrForTesting().getRoot().palette.palette;
          const rect = palette.getBoundingClientRect();
          palette.dispatchEvent(
            new MouseEvent("mousedown", {
              clientX: rect.left + rect.width / 2,
              clientY: rect.top + rect.height / 2,
            })
          );
        }
      });
    },
    [changeColorAfterMount]
  );

  return (
    <div ref={containerRef}>
      <ColorPicker ref={pickerRef} color={color} onChange={setColor} />
    </div>
  );
}

storiesOf("<ColorPicker>", module)
  .addDecorator(withScreenshot({ viewport: { width: 250, height: 150 } }))
  .add("invalid color", () => <Story />)
  .add("hex color", () => <Story initialColor="#cacad0" />)
  .add("click to open", () => <Story initialColor="#cacad0" openOnMount />)
  .add("click to set color", () => <Story initialColor="#cacad0" openOnMount changeColorAfterMount />);
