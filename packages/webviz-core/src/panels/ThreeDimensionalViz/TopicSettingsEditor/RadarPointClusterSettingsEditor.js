// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";

import Flex from "webviz-core/src/components/Flex";
import { Select, Option } from "webviz-core/src/components/Select";
import {
  CommonPointSettings,
  CommonDecaySettings,
  type TopicSettingsEditorProps,
} from "webviz-core/src/panels/ThreeDimensionalViz/TopicSettingsEditor";
import { SLabel, SDescription } from "webviz-core/src/panels/ThreeDimensionalViz/TopicSettingsEditor/common";
import type { RadarPointCluster } from "webviz-core/src/types/Messages";
import { fieldNames, getFieldFromPath } from "webviz-core/src/util/binaryObjects";

export type RadarPointClusterSettings = {|
  channel?: ?string,
  minPoint?: ?number,
  maxPoint?: ?number,

  pointSize?: ?number,
  pointShape?: ?string,
  decayTime?: ?number,
|};

export default function RadarPointClusterSettingsEditor(
  props: TopicSettingsEditorProps<RadarPointCluster, RadarPointClusterSettings>
) {
  const { message, settings, onFieldChange } = props;

  const firstPoint = getFieldFromPath(message, ["points", 0]);
  const fields = firstPoint ? fieldNames(firstPoint) : [];
  const colorFieldVal = settings.channel || "radial_vel";

  const minPoint = settings.minPoint;
  const minPointVal = typeof minPoint === "number" ? minPoint : -10;

  const maxPoint = settings.maxPoint;
  const maxPointVal = typeof maxPoint === "number" ? maxPoint : 10;

  return (
    <Flex col>
      <CommonPointSettings settings={settings} defaultPointSize={4} onFieldChange={onFieldChange} />

      <SLabel>Color by</SLabel>
      <Select text={colorFieldVal} value={colorFieldVal} onChange={(value) => onFieldChange("channel", value)}>
        {fields.map((field) => (
          <Option key={field} value={field}>
            {field}
          </Option>
        ))}
      </Select>

      <Flex>
        <Flex col>
          <SLabel>Min</SLabel>
          <input
            style={{ width: "95%" }}
            type="number"
            value={minPointVal.toString()}
            placeholder="-10"
            onChange={(e) => onFieldChange("minPoint", parseFloat(e.target.value))}
          />
        </Flex>

        <Flex col>
          <SLabel>Max</SLabel>
          <input
            style={{ width: "95%" }}
            type="number"
            value={maxPointVal.toString()}
            placeholder="10"
            onChange={(e) => onFieldChange("maxPoint", parseFloat(e.target.value))}
          />
        </Flex>
      </Flex>
      <SDescription>
        Values less than min will be red, greater than max will be purple, and within the range are yellow to blue.
      </SDescription>

      <CommonDecaySettings settings={settings} onFieldChange={onFieldChange} />
    </Flex>
  );
}
