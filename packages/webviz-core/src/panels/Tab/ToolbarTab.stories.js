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

import tick from "webviz-core/shared/tick";
import { ToolbarTab } from "webviz-core/src/panels/Tab/ToolbarTab";

const baseProps = {
  hidden: false,
  highlight: false,
  innerRef: null,
  isActive: false,
  isDragging: false,
  actions: {
    addTab: noop,
    removeTab: noop,
    selectTab: noop,
    setTabTitle: noop,
  },
  tabCount: 1,
  tabIndex: 0,
  tabTitle: "Tab Title",
};

const Container = React.forwardRef(({ children }, ref) => (
  <div style={{ margin: 8 }} ref={ref}>
    {children}
  </div>
));

storiesOf("<ToolbarTab>", module)
  .add("default", () => (
    <Container>
      <ToolbarTab {...baseProps} />
    </Container>
  ))
  .add("active with close icon", () => (
    <Container>
      <ToolbarTab {...{ ...baseProps, isActive: true, tabCount: 3 }} />
    </Container>
  ))
  .add("active without close icon", () => (
    <Container>
      <ToolbarTab {...{ ...baseProps, isActive: true, tabCount: 1 }} />
    </Container>
  ))
  .add("hidden", () => (
    <Container>
      <ToolbarTab {...{ ...baseProps, hidden: true }} />
    </Container>
  ))
  .add("highlight", () => (
    <Container>
      <ToolbarTab {...{ ...baseProps, highlight: true }} />
    </Container>
  ))
  .add("dragging", () => (
    <Container>
      <ToolbarTab {...{ ...baseProps, isDragging: true }} />
    </Container>
  ))
  .add("editing", () => (
    <Container
      ref={async (el) => {
        await tick();
        if (el) {
          el.querySelectorAll("input")[0].click();
        }
      }}>
      <ToolbarTab {...{ ...baseProps, isActive: true }} />
    </Container>
  ));
