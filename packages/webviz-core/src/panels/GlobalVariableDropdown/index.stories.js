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

import GlobalVariableDropdownPanel, { defaultConfig } from "webviz-core/src/panels/GlobalVariableDropdown/index";
import PanelSetup from "webviz-core/src/stories/PanelSetup";
import { basicDatatypes } from "webviz-core/src/util/datatypes";
import { useDelayedEffect } from "webviz-core/src/util/hooks";

const fixture = {
  topics: [{ name: "/def", datatype: "some_datatype" }],
  frame: {
    "/def": [
      {
        topic: "/def",
        receiveTime: { sec: 123, nsec: 456 },
        message: { animals: [{ name: "zebra" }, { name: "cat" }, { name: "dog" }] },
      },
    ],
  },
  datatypes: {
    ...basicDatatypes,
    animal_datatype: {
      fields: [{ name: "name", type: "string", isArray: false, isComplex: false }],
    },
    some_datatype: {
      fields: [{ name: "animals", type: "animal_datatype", isArray: true, isComplex: false }],
    },
  },
  capabilities: [],
  globalVariables: {},
};

const useHoverOnIcon = () => {
  useDelayedEffect(
    React.useCallback(() => {
      const hoverItem = document.querySelectorAll("[data-test=global-variable-dropdown-menu-icon]")[0];
      if (hoverItem) {
        TestUtils.Simulate.mouseEnter(hoverItem);
      }
    }, []),
    50 // ms
  );
};

storiesOf("<GlobalVariableDropdownPanel>", module)
  .add("default", () => {
    useHoverOnIcon();
    return (
      <PanelSetup fixture={fixture}>
        <GlobalVariableDropdownPanel />
      </PanelSetup>
    );
  })
  .add("default with existing global variable value", () => {
    return (
      <PanelSetup fixture={{ ...fixture, globalVariables: { globalVariable: 3.5 } }}>
        <GlobalVariableDropdownPanel />
      </PanelSetup>
    );
  })
  .add("custom global variable name with invalid path", () => {
    useHoverOnIcon();
    return (
      <PanelSetup fixture={fixture}>
        <GlobalVariableDropdownPanel
          config={{ ...defaultConfig, globalVariableName: "myGlobalVar", topicPath: "/abc" }}
        />
      </PanelSetup>
    );
  })
  .add("custom global variable name with valid path", () => {
    useDelayedEffect(
      React.useCallback(() => {
        document.querySelectorAll("[data-test=global-variable-dropdown-menu]")[0].click();
      }, []),
      100 // ms
    );

    return (
      <PanelSetup fixture={fixture}>
        <GlobalVariableDropdownPanel
          config={{ ...defaultConfig, globalVariableName: "myGlobalVar", topicPath: "/def.animals[:].name" }}
        />
      </PanelSetup>
    );
  });
