// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";

import { CommonPointSettings, CommonDecaySettings, type TopicSettingsEditorProps } from ".";
import Flex from "webviz-core/src/components/Flex";
import type { LaserScan } from "webviz-core/src/types/Messages";

type LaserScanSettings = {|
  pointSize?: ?number,
  pointShape?: ?string,
  decayTime?: ?number,
|};
export default function LaserScanSettingsEditor(props: TopicSettingsEditorProps<LaserScan, LaserScanSettings>) {
  const { settings, onFieldChange } = props;

  return (
    <Flex col>
      <CommonPointSettings
        settings={settings}
        defaultPointSize={4}
        defaultPointShape="square"
        onFieldChange={onFieldChange}
      />
      <CommonDecaySettings settings={settings} onFieldChange={onFieldChange} />
    </Flex>
  );
}
