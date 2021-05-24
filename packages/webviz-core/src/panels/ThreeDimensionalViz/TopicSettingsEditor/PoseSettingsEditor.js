// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";

import { type TopicSettingsEditorProps } from ".";
import ColorPickerForTopicSettings from "./ColorPickerForTopicSettings";
import { SLabel, SInput } from "./common";
import Flex from "webviz-core/src/components/Flex";
import type { PoseStamped } from "webviz-core/src/types/Messages";

type PoseSettings = {|
  overrideColor?: ?string,
  alpha?: number,
  size?: {
    headLength: number,
    headWidth: number,
    shaftWidth: number,
  },
  modelType?: "car-model" | "arrow",
|};

export default function PoseSettingsEditor(props: TopicSettingsEditorProps<PoseStamped, PoseSettings>) {
  const { settings, onFieldChange, onSettingsChange } = props;

  const settingsByCarType = React.useMemo(() => {
    switch (settings.modelType) {
      case "car-model": {
        const alpha = settings.alpha != null ? settings.alpha : 1;
        return (
          <Flex col>
            <SLabel>Alpha</SLabel>
            <SInput
              type="number"
              value={alpha.toString()}
              min={0}
              max={1}
              step={0.1}
              onChange={(e) => onSettingsChange({ ...settings, alpha: parseFloat(e.target.value) })}
            />
          </Flex>
        );
      }
      case "arrow":
      default: {
        const currentShaftWidth = settings.size?.shaftWidth ?? 2;
        const currentHeadWidth = settings.size?.headWidth ?? 2;
        const currentHeadLength = settings.size?.headLength ?? 0.1;
        return (
          <Flex col>
            <SLabel>Color</SLabel>
            <ColorPickerForTopicSettings
              color={settings.overrideColor}
              onChange={(newColor) => onFieldChange("overrideColor", newColor)}
            />
            <SLabel>Shaft width</SLabel>
            <SInput
              type="number"
              value={currentShaftWidth}
              placeholder="2"
              onChange={(e) =>
                onSettingsChange({ ...settings, size: { ...settings.size, shaftWidth: parseFloat(e.target.value) } })
              }
            />
            <SLabel>Head width</SLabel>
            <SInput
              type="number"
              value={currentHeadWidth}
              placeholder="2"
              onChange={(e) =>
                onSettingsChange({ ...settings, size: { ...settings.size, headWidth: parseFloat(e.target.value) } })
              }
            />
            <SLabel>Head length</SLabel>
            <SInput
              type="number"
              value={currentHeadLength}
              placeholder="0.1"
              onChange={(e) =>
                onSettingsChange({ ...settings, size: { ...settings.size, headLength: parseFloat(e.target.value) } })
              }
            />
          </Flex>
        );
      }
    }
  }, [onFieldChange, onSettingsChange, settings]);

  const badModelTypeSetting = React.useMemo(() => !["car-model", "arrow"].includes(settings.modelType), [settings]);

  return (
    <Flex col>
      <SLabel>Rendered Car</SLabel>
      <div
        style={{ display: "flex", margin: "4px", flexDirection: "column" }}
        onChange={(e) => {
          onSettingsChange({ ...settings, modelType: e.target.value, alpha: undefined });
        }}>
        {[{ value: "car-model", title: "Car Model" }, { value: "arrow", title: "Arrow" }].map(({ value, title }) => (
          <div key={value} style={{ marginBottom: "4px", display: "flex" }}>
            <input
              type="radio"
              value={value}
              checked={settings.modelType === value || (value === "arrow" && badModelTypeSetting)}
            />
            <label>{title}</label>
          </div>
        ))}
      </div>
      {settingsByCarType}
    </Flex>
  );
}

PoseSettingsEditor.canEditNamespaceOverrideColor = true;
