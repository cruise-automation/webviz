// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";
import type { Color } from "regl-worldview";

import { type TopicSettingsEditorProps } from ".";
import ColorPickerForTopicSettings from "./ColorPickerForTopicSettings";
import { SLabel, SDescription } from "./common";
import Flex from "webviz-core/src/components/Flex";
import TextField from "webviz-core/src/components/TextField";
import { type Icon3dMarkersMessage } from "webviz-core/src/types/Messages";

type IconTextTemplateEditProps = {|
  iconTextTemplate: string,
  onFieldChange: (name: string, value: any) => void,
|};
type MarkerSettings = {|
  overrideColor?: ?Color,
  iconTextTemplate?: ?string,
|};

export function IconTextTemplateEdit({ iconTextTemplate, onFieldChange }: IconTextTemplateEditProps) {
  return (
    <>
      <TextField
        label="Icon text template"
        value={iconTextTemplate}
        onChange={(newValue: string) => onFieldChange("iconTextTemplate", newValue)}
        placeholder="e.g. `${id} (${confidence})`"
      />
      <SDescription>Use the template string and metadata fields to configure the icon text.</SDescription>
    </>
  );
}

export default function IconMarkerSettingsEditor(
  props: TopicSettingsEditorProps<Icon3dMarkersMessage, MarkerSettings>
) {
  const { settings = {}, onFieldChange } = props;
  return (
    <Flex col>
      <SLabel>Color</SLabel>
      <SDescription>
        Overrides <code>color</code>/<code>colors</code> for all markers on this topic.
      </SDescription>
      <ColorPickerForTopicSettings
        color={settings.overrideColor}
        onChange={(newColor) => onFieldChange("overrideColor", newColor)}
      />
      <IconTextTemplateEdit iconTextTemplate={settings.iconTextTemplate || ""} onFieldChange={onFieldChange} />
    </Flex>
  );
}

IconMarkerSettingsEditor.canEditNamespaceOverrideColor = true;
