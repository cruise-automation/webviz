// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { withState } from "@dump247/storybook-state";
import SettingsIcon from "@mdi/svg/svg/settings.svg";
import { withKnobs, select } from "@storybook/addon-knobs";
import { storiesOf } from "@storybook/react";
import * as React from "react";
import { withScreenshot } from "storybook-chrome-screenshot";

import Dropdown from "webviz-core/src/components/Dropdown";
import Icon from "webviz-core/src/components/Icon";

storiesOf("<Dropdown>", module)
  .addDecorator(withScreenshot())
  .addDecorator(withKnobs)
  .add(
    "standard",
    withState({ value: "foo" }, (store) => {
      const { value } = store.state;
      const text = value === "foo" ? "one" : "";
      const position: "left" | "right" | "below" = select("position", ["left", "right", "below"], "below");
      return (
        <div style={{ margin: 20 }}>
          <Dropdown position={position} text={text} value={value} onChange={(value) => store.set({ value })}>
            <span value="foo">one</span>
            <span value="two">two</span>
            <hr />
            <span value="three">three</span>
          </Dropdown>
        </div>
      );
    })
  )
  .add(
    "with custom button",
    withState({ value: "foo" }, (store) => {
      const { value } = store.state;
      const text = value === "foo" ? "one" : "";
      return (
        <div style={{ margin: 20 }}>
          <Dropdown
            position="below"
            text={text}
            value={value}
            onChange={(value) => store.set({ value })}
            toggleComponent={
              <Icon fade>
                <SettingsIcon />
              </Icon>
            }>
            <span value="foo">one</span>
            <span value="two">two</span>
            <hr />
            <span value="three">three</span>
          </Dropdown>
        </div>
      );
    })
  );
