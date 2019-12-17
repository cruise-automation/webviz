// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import CheckboxBlankOutlineIcon from "@mdi/svg/svg/checkbox-blank-outline.svg";
import CheckboxMarkedIcon from "@mdi/svg/svg/checkbox-marked.svg";
import React from "react";

import { type TopicSettingsEditorProps } from ".";
import { SLabel, SInput } from "./common";
import Flex from "webviz-core/src/components/Flex";
import type { PoseStamped } from "webviz-core/src/types/Messages";

type PoseSettings = {|
  color?: ?string,
  alpha?: number,
  size?: {
    headLength: number,
    headWidth: number,
    shaftWidth: number,
  },
  useCarModel?: boolean,
|};

export default function PoseSettingsEditor(props: TopicSettingsEditorProps<PoseStamped, PoseSettings>) {
  const { message, settings, onFieldChange, onSettingsChange } = props;

  if (!message) {
    return null;
  }

  const alpha = settings.alpha != null ? settings.alpha : 1;
  const alphaField = (
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
  const currentShaftWidth = settings.size?.shaftWidth ?? 2;
  const currentHeadWidth = settings.size?.headWidth ?? 2;
  const currentHeadLength = settings.size?.headLength ?? 0.1;
  const colorInputFields = (
    <Flex col>
      <SLabel>Color (r,g,b,a)</SLabel>
      <SInput
        type="text"
        value={
          // must be non-undefined to avoid changing to an uncontrolled component when switching on/off the car model
          settings.color || ""
        }
        placeholder="e.g. 255, 0, 100, 0.5"
        onChange={(e) => onFieldChange("color", e.target.value)}
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

  const CheckboxComponent = settings.useCarModel ? CheckboxMarkedIcon : CheckboxBlankOutlineIcon;
  const iconProps = {
    width: 16,
    height: 16,
    style: {
      fill: "currentColor",
      position: "relative",
      top: "5px",
    },
  };

  return (
    <Flex col>
      <Flex style={{ marginBottom: "5px", cursor: "pointer" }}>
        <CheckboxComponent
          {...iconProps}
          onClick={() => onSettingsChange({ ...settings, useCarModel: !settings.useCarModel, alpha: undefined })}
        />
        <SLabel>Use 3D model</SLabel>
      </Flex>
      {settings.useCarModel ? alphaField : colorInputFields}
    </Flex>
  );
}
