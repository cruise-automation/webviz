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
import type { Marker, MarkerArray } from "webviz-core/src/types/Messages";

type MarkerSettings = {|
  overrideColor?: ?Color,
|};

export default function MarkerOverrideColorSettingsEditor(
  props: TopicSettingsEditorProps<Marker | MarkerArray, MarkerSettings>
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
    </Flex>
  );
}

MarkerOverrideColorSettingsEditor.canEditNamespaceOverrideColor = true;
