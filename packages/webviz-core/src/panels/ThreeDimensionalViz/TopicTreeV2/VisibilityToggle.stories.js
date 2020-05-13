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
  visibleInScene,
  showFocused,
  showToggled,
}: {|
  checked?: boolean,
  overrideColor?: string,
  size?: Size,
  title: string,
  visibleInScene?: boolean,
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
          const toggleEl = ((el.querySelector(`[data-test="myToggle"]`): any): HTMLInputElement);
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
        visibleInScene={!!visibleInScene}
        size={size}
        overrideColor={overrideColor}
        dataTest="myToggle"
      />
    </div>
  );
}
storiesOf("<VisibilityToggle>", module)
  .addDecorator(withScreenshot())
  .add("default", () => {
    return (
      <div>
        <Example checked visibleInScene title="checked: true, visibleInScene: true" />
        <Example visibleInScene title="visibleInScene: true" />
        <Example visibleInScene={false} checked={false} title="visibleInScene: false, checked: false" />
        <Example visibleInScene={false} checked title="visibleInScene: false, checked: true" />
        <Example
          checked
          visibleInScene
          size={TOGGLE_SIZE_CONFIG.SMALL.name}
          title="checked: true, visibleInScene: true, size: SMALL "
        />
        <Example
          checked
          visibleInScene
          overrideColor="rgba(150,200,0,1)"
          title="checked: true, visibleInScene: true, overrideColor: rgba(150,200,0,1)"
        />
        <Example
          visibleInScene
          overrideColor="rgba(150,200,0,1)"
          title="checked: false, visibleInScene: true, overrideColor: rgba(150,200,0,1)"
        />
        <Example
          checked
          visibleInScene={false}
          overrideColor="rgba(150,200,0,1)"
          title="checked: true, visibleInScene: false, overrideColor: rgba(150,200,0,1)"
        />
        <Example
          showToggled
          checked
          visibleInScene
          title="checked: true, visibleInScene: true, click to toggle checked"
        />
      </div>
    );
  })
  .add("focused when checked is false", () => {
    return <Example showFocused visibleInScene title="checked: false, visibleInScene: true, show focused state" />;
  })
  .add("focused state when checked is true", () => {
    return (
      <Example showFocused checked visibleInScene title="checked: true, visibleInScene: true, show focused state" />
    );
  });
