// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import SettingsIcon from "@mdi/svg/svg/settings.svg";
import { storiesOf } from "@storybook/react";
import React, { useState } from "react";

import Dropdown from "webviz-core/src/components/Dropdown";
import Icon from "webviz-core/src/components/Icon";

function Example({
  position = "below",
  showCustomBtn = false,
}: {
  position?: "left" | "right" | "below",
  showCustomBtn?: boolean,
}) {
  const [value, setValue] = useState("foo");
  const text = value === "foo" ? "one" : "";
  const additionalProps = showCustomBtn
    ? {
        toggleComponent: (
          <Icon fade>
            <SettingsIcon />
          </Icon>
        ),
      }
    : {};
  return (
    <div style={{ margin: 20 }}>
      <Dropdown position={position} text={text} value={value} onChange={setValue} {...additionalProps}>
        <span value="foo">one</span>
        <span value="two">two</span>
        <hr />
        <span value="three">three</span>
      </Dropdown>
    </div>
  );
}
storiesOf("<Dropdown>", module)
  .add("position_below", () => <Example position="below" />)
  .add("position_left", () => <Example position="left" />)
  .add("position_right", () => <Example position="right" />)
  .add("with custom button", () => <Example showCustomBtn />);
