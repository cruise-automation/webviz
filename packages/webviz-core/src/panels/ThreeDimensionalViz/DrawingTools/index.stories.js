// @flow
//
//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import React from "react";
import { PolygonBuilder, DEFAULT_CAMERA_STATE } from "regl-worldview";
import { withScreenshot } from "storybook-chrome-screenshot";

import DrawingTools, { DRAWING_CONFIG } from "./index";
import { pointsToPolygons } from "webviz-core/src/panels/ThreeDimensionalViz/utils/drawToolUtils";

const polygons = pointsToPolygons([
  [{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }],
  [{ x: 4, y: 4 }, { x: 5, y: 5 }, { x: 6, y: 6 }],
]);

const containerStyle = {
  width: 272,
  margin: 8,
  display: "inline-block",
};

const POLYGON_TYPE = DRAWING_CONFIG.Polygons.type;
const CAMERA_TYPE = DRAWING_CONFIG.Camera.type;

const DEFAULT_PROPS = {
  cameraState: DEFAULT_CAMERA_STATE,
  expanded: true,
  followOrientation: false,
  followTf: "some_frame",
  onAlignXYAxis: () => {},
  onCameraStateChange: () => {},
  onExpand: () => {},
  onSetPolygons: () => {},
  onSetType: () => {},
  polygonBuilder: new PolygonBuilder(polygons),
  saveConfig: () => {},
  selectedPolygonEditFormat: "yaml",
  setType: () => {},
  showCrosshair: false,
  type: POLYGON_TYPE,
  updatePanelConfig: () => {},
};

storiesOf("<DrawingTools>", module)
  .addDecorator(withScreenshot())
  .add("Polygon", () => {
    return (
      <div style={containerStyle}>
        <div style={{ margin: 8 }}>
          <DrawingTools {...DEFAULT_PROPS} type={POLYGON_TYPE} selectedPolygonEditFormat="yaml" />
        </div>
        <div style={{ margin: 8 }}>
          <DrawingTools {...DEFAULT_PROPS} type={POLYGON_TYPE} selectedPolygonEditFormat="json" />
        </div>
      </div>
    );
  })
  .add("Camera", () => {
    return (
      <div>
        <div style={containerStyle}>
          <h2>Default</h2>
          <DrawingTools {...DEFAULT_PROPS} type={CAMERA_TYPE} />
        </div>
        <div style={containerStyle}>
          <h2>Follow orientation</h2>
          <DrawingTools {...DEFAULT_PROPS} followOrientation type={CAMERA_TYPE} />
        </div>
        <div style={containerStyle}>
          <h2>3D and showCrosshair</h2>
          <DrawingTools {...DEFAULT_PROPS} type={CAMERA_TYPE} showCrosshair />
        </div>
        <div style={containerStyle}>
          <h2>2D and showCrosshair</h2>
          <DrawingTools
            {...DEFAULT_PROPS}
            cameraState={{ ...DEFAULT_CAMERA_STATE, perspective: false }}
            type={CAMERA_TYPE}
            showCrosshair
          />
        </div>
      </div>
    );
  });
