// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import React from "react";
import { PolygonBuilder } from "regl-worldview";

import DrawingTools, { POLYGON_TAB_TYPE } from "./index";
import { pointsToPolygons } from "webviz-core/src/panels/ThreeDimensionalViz/utils/drawToolUtils";
import { useDelayedEffect } from "webviz-core/src/util/hooks";

const polygons = pointsToPolygons([
  [{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }],
  [{ x: 4, y: 4 }, { x: 5, y: 5 }, { x: 6, y: 6 }],
]);

const containerStyle = {
  margin: 8,
  display: "inline-block",
};

const DEFAULT_PROPS = {
  expanded: true,
  onAlignXYAxis: () => {},
  onExpand: () => {},
  onSetDrawingTabType: () => {},
  onSetPolygons: () => {},
  polygonBuilder: new PolygonBuilder(polygons),
  saveConfig: () => {},
  selectedPolygonEditFormat: "yaml",
  type: POLYGON_TAB_TYPE,
  updatePanelConfig: () => {},
};

storiesOf("<DrawingTools>", module)
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
  .add("Polygon clearing", () => {
    // Click the clear button
    useDelayedEffect(
      React.useCallback(() => {
        Array.from(document.querySelectorAll("button"))
          .filter((el) => el.innerText === "Clear")[0]
          .click();
      }, [])
    );
    return (
      <div style={containerStyle}>
        <div style={{ margin: 8 }}>
          <DrawingTools {...DEFAULT_PROPS} defaultSelectedTab={POLYGON_TAB_TYPE} selectedPolygonEditFormat="yaml" />
        </div>
      </div>
    );
  });
