// @flow
//
//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";

import { SLabel, SInput, CommonPointSettings, CommonDecaySettings, type TopicSettingsEditorProps } from ".";
import Flex from "webviz-core/src/components/Flex";
import { Select, Option } from "webviz-core/src/components/Select";
import type { PointCloud2 } from "webviz-core/src/types/Messages";

type PointCloudSettings = {|
  pointSize?: ?number,
  pointShape?: ?string,
  decayTime?: ?number,
  colorField?: ?string,
  color?: ?string,
|};

export default function PointCloudSettingsEditor(props: TopicSettingsEditorProps<PointCloud2, PointCloudSettings>) {
  const { message, settings, onFieldChange, onSettingsChange } = props;
  if (!message || !message.fields) {
    return null;
  }
  const colorField = settings.colorField;
  const colorFieldValue = colorField ? colorField : "rgb";

  const color = settings.color;
  const colorValue = color || "";

  const colorFieldOptions = message.fields.map((field) => (
    <Option key={field.name} value={field.name}>
      {field.name}
    </Option>
  ));

  return (
    <Flex col>
      <CommonPointSettings settings={settings} defaultPointSize={2} onFieldChange={onFieldChange} />
      <SLabel strikethrough={!!colorValue}>Color by {!!colorValue && "(overridden)"}</SLabel>
      <Select
        text={colorFieldValue}
        value={colorFieldValue}
        onChange={(value) => {
          onSettingsChange({
            ...settings,
            colorField: value,
            color: undefined,
          });
        }}>
        {colorFieldOptions}
      </Select>
      <SLabel>Point color (overrides Color by)</SLabel>
      <SInput
        type="text"
        value={colorValue}
        placeholder="RGB e.g. 255, 0, 100"
        onChange={(e) => onFieldChange("color", e.target.value)}
      />
      <CommonDecaySettings settings={settings} onFieldChange={onFieldChange} />
    </Flex>
  );
}
