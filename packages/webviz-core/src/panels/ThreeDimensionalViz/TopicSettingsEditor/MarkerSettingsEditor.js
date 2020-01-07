// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";

import { LINED_CONVEX_HULL_RENDERING_SETTING, type TopicSettingsEditorProps } from ".";
import { SLabel, SDescription, SInput } from "./common";
import Checkbox from "webviz-core/src/components/Checkbox";
import Flex from "webviz-core/src/components/Flex";
import type { Marker, MarkerArray } from "webviz-core/src/types/Messages";

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
      <SLabel>Line marker click events override</SLabel>
      <SDescription>
        {`
        Optionally allow treating line markers as polygons, so that clicking inside the lines in the line marker selects
        the marker. The default behavior for line markers requires the user to click exactly on the line to select the
        line marker. This option can reduce performance and will not work on instanced line markers (those with "type":
        105).
        `}
      </SDescription>
      <Checkbox
        checked={settings.overrideCommand === LINED_CONVEX_HULL_RENDERING_SETTING}
        label="Allow clicking inside line markers that form polygons"
        onChange={(checked) => onFieldChange("overrideCommand", checked ? LINED_CONVEX_HULL_RENDERING_SETTING : null)}
        style={{ marginBottom: 12 }}
        labelStyle={{ lineHeight: 1.2 }}
      />
    </Flex>
  );
}
