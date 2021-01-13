// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import React from "react";
import TestUtils from "react-dom/test-utils";

import GlobalVariableSliderPanel from "webviz-core/src/panels/GlobalVariableSlider/index";
import PanelSetup from "webviz-core/src/stories/PanelSetup";

const fixture = {
  topics: [],
  datatypes: {
    Foo: { fields: [] },
  },
  frame: {},
  capabilities: [],
  globalVariables: { globalVariable: 3.5 },
};

storiesOf("<GlobalVariableSliderPanel>", module)
  .add("example", () => {
    return (
      <PanelSetup fixture={fixture}>
        <GlobalVariableSliderPanel />
      </PanelSetup>
    );
  })
  .add("labels do not overlap when panel narrow", () => {
    return (
      <PanelSetup fixture={fixture}>
        <div style={{ width: 400 }}>
          <GlobalVariableSliderPanel />
        </div>
      </PanelSetup>
    );
  })
  .add("menu", () => {
    return (
      <PanelSetup fixture={fixture}>
        <GlobalVariableSliderPanel
          ref={() => {
            setTimeout(() => {
              const mouseEnterContainer = document.querySelectorAll("[data-test~=panel-mouseenter-container")[0];
              TestUtils.Simulate.mouseEnter(mouseEnterContainer);
              document.querySelectorAll("[data-test=panel-settings]")[0].click();
            }, 50);
          }}
        />
      </PanelSetup>
    );
  });
