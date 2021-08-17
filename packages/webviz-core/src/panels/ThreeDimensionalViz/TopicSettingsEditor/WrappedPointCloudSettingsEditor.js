// @flow
//
//  Copyright (c) 2021-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";

import type { PointCloudSettings } from "webviz-core/src/panels/ThreeDimensionalViz/commands/PointClouds/types";
import { type TopicSettingsEditorProps } from "webviz-core/src/panels/ThreeDimensionalViz/TopicSettingsEditor";
import PointCloudSettingsEditor from "webviz-core/src/panels/ThreeDimensionalViz/TopicSettingsEditor/PointCloudSettingsEditor";
import { getField } from "webviz-core/src/util/binaryObjects";

export default function WrappedPointCloudSettingsEditor(props: TopicSettingsEditorProps<any, PointCloudSettings>) {
  return <PointCloudSettingsEditor {...props} message={getField(props.message, "cloud")} />;
}
WrappedPointCloudSettingsEditor.canEditNamespaceOverrideColor = true;
