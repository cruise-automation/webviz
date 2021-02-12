// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import React, { type Node as ReactNode, useCallback, useMemo } from "react";
import { hot } from "react-hot-loader/root";

import GlobalVariableSlider from "webviz-core/src/components/GlobalVariableSlider";
import Item from "webviz-core/src/components/Menu/Item";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import type { SliderProps } from "webviz-core/src/components/SliderWithTicks";
import TextField from "webviz-core/src/components/TextField";
import useGlobalVariables from "webviz-core/src/hooks/useGlobalVariables";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";

export type GlobalVariableSliderConfig = {
  sliderProps: SliderProps,
  globalVariableName: string,
};

type Props = {
  config: GlobalVariableSliderConfig,
  saveConfig: ($Shape<GlobalVariableSliderConfig>) => void,
};

type MenuProps = {
  config: GlobalVariableSliderConfig,
  updateConfig: (config: $Shape<GlobalVariableSliderConfig>) => void,
};

// Validation helper functions for the SliderSettingsMenu
const minMaxValidatorFn = (str) => (isNaN(parseFloat(str)) ? "Must be valid number" : null);
const stepValidatorFn = (str) => {
  const result = minMaxValidatorFn(str);
  if (result) {
    return result;
  }
  const number = parseFloat(str);
  if (number <= 0) {
    return "Must be >= 0";
  }
  return null;
};

function SliderSettingsMenu(props: MenuProps) {
  const { updateConfig, config } = props;
  const { sliderProps, globalVariableName } = config;

  const updateSliderProps = useCallback((partial: $Shape<SliderProps>) => {
    updateConfig({
      ...config,
      sliderProps: { ...sliderProps, ...partial },
    });
  }, [config, sliderProps, updateConfig]);

  const onChangeVariableName = useCallback(
    (newGlobalVariableName) =>
      updateConfig({
        ...config,
        globalVariableName: newGlobalVariableName,
      }),
    [config, updateConfig]
  );

  const onChangeMin = useCallback((min) => updateSliderProps({ min: parseFloat(min) }), [updateSliderProps]);
  const onChangeMax = useCallback((max) => updateSliderProps({ max: parseFloat(max) }), [updateSliderProps]);
  const onChangeStep = useCallback((step) => updateSliderProps({ step: parseFloat(step) }), [updateSliderProps]);
  return (
    <>
      <Item>
        <TextField
          value={globalVariableName}
          onChange={onChangeVariableName}
          label="Global variable name"
          validateOnBlur
        />
      </Item>
      <Item>
        <TextField
          value={`${sliderProps.min}`}
          onChange={onChangeMin}
          placeholder="Min"
          label="Min"
          validator={minMaxValidatorFn}
        />
      </Item>
      <Item>
        <TextField
          value={`${sliderProps.max}`}
          onChange={onChangeMax}
          placeholder="Max"
          label="Max"
          validator={minMaxValidatorFn}
        />
      </Item>
      <Item>
        <TextField
          value={`${sliderProps.step}`}
          onChange={onChangeStep}
          placeholder="Step"
          label="Step"
          validator={stepValidatorFn}
        />
      </Item>
    </>
  );
}

function GlobalVariableSliderPanel(props: Props): ReactNode {
  const { config, saveConfig } = props;
  const { sliderProps, globalVariableName } = config;
  const { globalVariables, setGlobalVariables } = useGlobalVariables();

  const globalVariableValue = globalVariables[globalVariableName];
  const saveSliderProps = useCallback((updatedConfig) => {
    // If the name of the global variable changes, immediately set its value.
    // Without this, the variable won't be set until the slider is moved.
    if (updatedConfig.globalVariableName !== config.globalVariableName) {
      setGlobalVariables({ [updatedConfig.globalVariableName]: globalVariableValue });
    }
    saveConfig(updatedConfig);
  }, [config.globalVariableName, globalVariableValue, saveConfig, setGlobalVariables]);
  const additionalOutput = useMemo(() => {
    return getGlobalHooks()
      .perPanelHooks()
      .GlobalVariableSlider.getVariableSpecificOutput(globalVariableName, globalVariables);
  }, [globalVariableName, globalVariables]);
  const menuContent = useMemo(() => <SliderSettingsMenu config={config} updateConfig={saveSliderProps} />, [
    config,
    saveSliderProps,
  ]);
  return (
    <div style={{ padding: "25px 4px 4px" }}>
      <PanelToolbar floating menuContent={menuContent} />
      <GlobalVariableSlider sliderProps={sliderProps} globalVariableName={globalVariableName} />
      {additionalOutput}
    </div>
  );
}

GlobalVariableSliderPanel.panelType = "GlobalVariableSliderPanel";
GlobalVariableSliderPanel.defaultConfig = {
  sliderProps: { min: 0, max: 10, step: 1 },
  globalVariableName: "globalVariable",
};

export default hot(Panel<GlobalVariableSliderConfig>(GlobalVariableSliderPanel));
