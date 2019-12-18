// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import React from "react";
import { PolygonBuilder, DEFAULT_CAMERA_STATE } from "regl-worldview";
import { withScreenshot } from "storybook-chrome-screenshot";

import DrawingTools, { CAMERA_TAB_TYPE, POLYGON_TAB_TYPE } from "./index";
import { pointsToPolygons } from "webviz-core/src/panels/ThreeDimensionalViz/utils/drawToolUtils";

const polygons = pointsToPolygons([
  [{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }],
  [{ x: 4, y: 4 }, { x: 5, y: 5 }, { x: 6, y: 6 }],
]);

const containerStyle = {
  margin: 8,
  display: "inline-block",
};

const DEFAULT_PROPS = {
  cameraState: DEFAULT_CAMERA_STATE,
  expanded: true,
  followOrientation: false,
  followTf: "some_frame",
  onAlignXYAxis: () => {},
  onCameraStateChange: () => {},
  onExpand: () => {},
  onSetDrawingTabType: () => {},
  onSetPolygons: () => {},
  polygonBuilder: new PolygonBuilder(polygons),
  saveConfig: () => {},
  selectedPolygonEditFormat: "yaml",
  showCrosshair: false,
  type: POLYGON_TAB_TYPE,
  updatePanelConfig: () => {},
};

storiesOf("<DrawingTools>", module)
  .addDecorator(withScreenshot())
  .add("Polygon", () => {
    return (
      <div style={containerStyle}>
        <div style={{ margin: 8 }}>
          <DrawingTools {...DEFAULT_PROPS} defaultSelectedTab={POLYGON_TAB_TYPE} selectedPolygonEditFormat="yaml" />
        </div>
        <div style={{ margin: 8 }}>
          <DrawingTools {...DEFAULT_PROPS} defaultSelectedTab={POLYGON_TAB_TYPE} selectedPolygonEditFormat="json" />
        </div>
      </div>
    );
  })
  .add("Camera", () => {
    return (
      <div>
        <div style={containerStyle}>
          <h2>Default</h2>
          <DrawingTools {...DEFAULT_PROPS} defaultSelectedTab={CAMERA_TAB_TYPE} />
        </div>
        <div style={containerStyle}>
          <h2>Follow orientation</h2>
          <DrawingTools {...DEFAULT_PROPS} followOrientation defaultSelectedTab={CAMERA_TAB_TYPE} />
        </div>
        <div style={containerStyle}>
          <h2>3D and showCrosshair</h2>
          <DrawingTools {...DEFAULT_PROPS} defaultSelectedTab={CAMERA_TAB_TYPE} showCrosshair />
        </div>
        <div style={containerStyle}>
          <h2>2D and showCrosshair</h2>
          <DrawingTools
            {...DEFAULT_PROPS}
            cameraState={{ ...DEFAULT_CAMERA_STATE, perspective: false }}
            defaultSelectedTab={CAMERA_TAB_TYPE}
            showCrosshair
          />
        </div>
      </div>
    );
  });
