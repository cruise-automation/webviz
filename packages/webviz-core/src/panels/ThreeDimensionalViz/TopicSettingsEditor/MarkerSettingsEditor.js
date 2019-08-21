// @flow
//
//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";

import { SLabel, SDescription, SInput, type TopicSettingsEditorProps } from ".";
import Flex from "webviz-core/src/components/Flex";
import type { Marker, MarkerArray } from "webviz-core/src/types/Messages";

type MarkerSettings = {|
  overrideColor?: ?string,
|};

export default function MarkerSettingsEditor(props: TopicSettingsEditorProps<Marker | MarkerArray, MarkerSettings>) {
  const { settings, onFieldChange } = props;
  return (
    <Flex col>
      <SLabel>Color (r,g,b,a)</SLabel>
      <SDescription>
        Overrides <code>color</code>/<code>colors</code> for all markers on this topic.
      </SDescription>
      <SInput
        type="text"
        value={settings.overrideColor || ""}
        placeholder="e.g. 255, 0, 100, 0.5"
        onChange={(e) => onFieldChange("overrideColor", e.target.value)}
      />
    </Flex>
  );
}
