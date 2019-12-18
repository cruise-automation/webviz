// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";
import styled from "styled-components";

import { LINED_CONVEX_HULL_RENDERING_SETTING, type TopicSettingsEditorProps } from ".";
import { SLabel, SDescription, SInput } from "./common";
import Dropdown from "webviz-core/src/components/Dropdown";
import Flex from "webviz-core/src/components/Flex";
import type { Marker, MarkerArray } from "webviz-core/src/types/Messages";

const SDropdown = styled.label`
  margin-bottom: 12px;
`;

type MarkerSettings = {|
  overrideColor?: ?string,
  overrideCommand?: ?string,
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
      <SLabel>Command rendering</SLabel>
      <SDescription>Overrides the Command used to render markers this topic.</SDescription>
      <SDropdown>
        <Dropdown
          position="below"
          onChange={(value) => onFieldChange("overrideCommand", value && value !== "default" ? value : null)}
          value={settings.overrideCommand || "default"}>
          <option value="default">Default</option>
          <option value={LINED_CONVEX_HULL_RENDERING_SETTING}>Lined convex hull (line markers only)</option>
        </Dropdown>
      </SDropdown>
    </Flex>
  );
}
