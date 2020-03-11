// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import PencilIcon from "@mdi/svg/svg/pencil.svg";
import * as React from "react";
import { PolygonBuilder, Polygon } from "regl-worldview";

import Polygons from "./Polygons";
import ExpandingToolbar, { ToolGroup } from "webviz-core/src/components/ExpandingToolbar";
import Icon from "webviz-core/src/components/Icon";
import { EDIT_FORMAT, type EditFormat } from "webviz-core/src/components/ValidatedInput";
import styles from "webviz-core/src/panels/ThreeDimensionalViz/Layout.module.scss";
import colors from "webviz-core/src/styles/colors.module.scss";

export const POLYGON_TAB_TYPE = "Polygons";
export type DrawingTabType = typeof POLYGON_TAB_TYPE;
export type Point2D = {| x: number, y: number |};
type Props = {
  onSetPolygons: (polygons: Polygon[]) => void,
  polygonBuilder: PolygonBuilder,
  selectedPolygonEditFormat: EditFormat,
  onSetDrawingTabType: (?DrawingTabType) => void,
  defaultSelectedTab?: DrawingTabType, // for UI testing
};

// add more drawing shapes later, e.g. Grid, Axes, Crosshairs
function DrawingTools({
  defaultSelectedTab,
  onSetDrawingTabType,
  onSetPolygons,
  polygonBuilder,
  selectedPolygonEditFormat,
}: Props) {
  const [selectedTab, setSelectedTab] = React.useState<?DrawingTabType>(defaultSelectedTab);

  return (
    <ExpandingToolbar
      tooltip="Drawing tools"
      icon={
        <Icon style={{ color: selectedTab ? colors.accent : "white" }}>
          <PencilIcon />
        </Icon>
      }
      className={styles.buttons}
      selectedTab={selectedTab}
      onSelectTab={(newSelectedTab) => {
        onSetDrawingTabType(newSelectedTab);
        setSelectedTab(newSelectedTab);
      }}>
      <ToolGroup name={POLYGON_TAB_TYPE}>
        <Polygons
          onSetPolygons={onSetPolygons}
          polygonBuilder={polygonBuilder}
          selectedPolygonEditFormat={selectedPolygonEditFormat}
        />
      </ToolGroup>
    </ExpandingToolbar>
  );
}

DrawingTools.defaultProps = {
  selectedPolygonEditFormat: EDIT_FORMAT.YAML,
};

export default React.memo<Props>(DrawingTools);
