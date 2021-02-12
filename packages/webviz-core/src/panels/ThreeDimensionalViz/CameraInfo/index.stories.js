// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import React from "react";
import { DEFAULT_CAMERA_STATE } from "regl-worldview";

import CameraInfo, { CAMERA_TAB_TYPE } from "webviz-core/src/panels/ThreeDimensionalViz/CameraInfo";

const containerStyle = {
  margin: 8,
  display: "inline-block",
};

const DEFAULT_PROPS = {
  cameraState: DEFAULT_CAMERA_STATE,
  targetPose: undefined,
  expanded: true,
  followOrientation: false,
  followTf: "some_frame",
  onAlignXYAxis: () => {},
  onCameraStateChange: () => {},
  onExpand: () => {},
  saveConfig: () => {},
  showCrosshair: false,
  type: CAMERA_TAB_TYPE,
  updatePanelConfig: () => {},
  autoSyncCameraState: false,
};

const CameraInfoWrapper = (props) => (
  <div style={containerStyle}>
    <CameraInfo {...DEFAULT_PROPS} defaultSelectedTab={CAMERA_TAB_TYPE} {...props} />
  </div>
);

storiesOf("<CameraInfo>", module)
  .add("Default", () => <CameraInfoWrapper />)
  .add("Follow orientation", () => <CameraInfoWrapper followOrientation />)
  .add("3D and showCrosshair", () => <CameraInfoWrapper showCrosshair />)
  .add("2D and showCrosshair", () => (
    <CameraInfoWrapper cameraState={{ ...DEFAULT_CAMERA_STATE, perspective: false }} showCrosshair />
  ));
