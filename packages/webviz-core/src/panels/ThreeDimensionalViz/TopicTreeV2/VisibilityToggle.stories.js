// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import React, { useState, useCallback, useRef } from "react";
import { withScreenshot } from "storybook-chrome-screenshot";

import VisibilityToggle, { type Size, TOGGLE_SIZE_CONFIG } from "./VisibilityToggle";

function Example({
  checked: defaultChecked,
  overrideColor,
  size,
  title,
  visible,
  showFocused,
  showToggled,
}: {|
  checked?: boolean,
  overrideColor?: string,
  size?: Size,
  title: string,
  visible?: boolean,
  showFocused?: boolean,
  showToggled?: boolean,
|}) {
  const [checked, setChecked] = useState(!!defaultChecked);
  const onToggle = useCallback(
    () => {
      setChecked(!checked);
    },
    [checked]
  );
  const renderedRef = useRef(false);
  return (
    <div
      style={{ marginBottom: 16 }}
      ref={(el) => {
        if (!el || renderedRef.current) {
          return;
        }
        if (showToggled || showFocused) {
          const toggleEl = ((el.querySelector(`[data-test="myInput"]`): any): HTMLInputElement);
          if (showToggled) {
            toggleEl.click();
          } else if (showFocused) {
            toggleEl.focus();
          }
        }
        renderedRef.current = true;
      }}>
      <p>{title}</p>
      <VisibilityToggle
        checked={checked}
        onToggle={onToggle}
        visible={!!visible}
        size={size}
        overrideColor={overrideColor}
        dataTestId="myInput"
      />
    </div>
  );
}
storiesOf("<VisibilityToggle>", module)
  .addDecorator(withScreenshot())
  .add("default", () => {
    return (
      <div>
        <Example checked visible title="checked: true, visible: true" />
        <Example visible title="visible: true" />
        <Example visible={false} checked={false} title="visible: false, checked: false" />
        <Example visible={false} checked title="visible: false, checked: true" />
        <Example
          checked
          visible
          size={TOGGLE_SIZE_CONFIG.SMALL.name}
          title="checked: true, visible: true, size: SMALL "
        />
        <Example
          checked
          visible
          overrideColor="rgba(150,200,0,1)"
          title="checked: true, visible: true, overrideColor: rgba(150,200,0,1)"
        />
        <Example
          visible
          overrideColor="rgba(150,200,0,1)"
          title="checked: false, visible: true, overrideColor: rgba(150,200,0,1)"
        />
        <Example
          checked
          visible={false}
          overrideColor="rgba(150,200,0,1)"
          title="checked: true, visible: false, overrideColor: rgba(150,200,0,1)"
        />
        <Example showToggled checked visible title="checked: true, visible: true, click to toggle checked" />
      </div>
    );
  })
  .add("focused when checked is false", () => {
    return <Example showFocused visible title="checked: false, visible: true, show focused state" />;
  })
  .add("focused state when checked is true", () => {
    return <Example showFocused checked visible title="checked: true, visible: true, show focused state" />;
  });
