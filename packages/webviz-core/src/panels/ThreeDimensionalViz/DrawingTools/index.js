// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import CameraControlIcon from "@mdi/svg/svg/camera-control.svg";
import PencilIcon from "@mdi/svg/svg/pencil.svg";
import * as React from "react";
import { PolygonBuilder, Polygon, type CameraState } from "regl-worldview";

import Polygons from "./Polygons";
import ExpandingToolbar, { ToolGroup } from "webviz-core/src/components/ExpandingToolbar";
import Icon from "webviz-core/src/components/Icon";
import { EDIT_FORMAT, type EditFormat } from "webviz-core/src/components/ValidatedInput";
import CameraInfo, {
  type CameraInfoPropsWithoutCameraState,
} from "webviz-core/src/panels/ThreeDimensionalViz/DrawingTools/CameraInfo";
import styles from "webviz-core/src/panels/ThreeDimensionalViz/Layout.module.scss";
import colors from "webviz-core/src/styles/colors.module.scss";

export const POLYGON_TAB_TYPE = "Polygons";
export const CAMERA_TAB_TYPE = "Camera";
export type DrawingTabType = typeof POLYGON_TAB_TYPE | typeof CAMERA_TAB_TYPE;
export type Point2D = {| x: number, y: number |};
type Props = {
  isPlaying?: boolean,
  onCameraStateChange: (CameraState) => void,
  onSetPolygons: (polygons: Polygon[]) => void,
  polygonBuilder: PolygonBuilder,
  selectedPolygonEditFormat: EditFormat,
  onSetDrawingTabType: (?DrawingTabType) => void,
  // Camera state is optional here because we want to avoid passing it in unless necessary: otherwise it would lead to
  // re-renders on every camera state change.
  cameraState: ?$Shape<CameraState>,
  defaultSelectedTab?: DrawingTabType, // for UI testing
} & CameraInfoPropsWithoutCameraState;

// add more drawing shapes later, e.g. Grid, Axes, Crosshairs
function DrawingTools({
  cameraState,
  defaultSelectedTab,
  followOrientation,
  followTf,
  isPlaying,
  onAlignXYAxis,
  onCameraStateChange,
  onSetDrawingTabType,
  onSetPolygons,
  polygonBuilder,
  selectedPolygonEditFormat,
  showCrosshair,
}: Props) {
  const [selectedTab, setSelectedTab] = React.useState<?DrawingTabType>(defaultSelectedTab);
  const IconName = selectedTab === CAMERA_TAB_TYPE ? CameraControlIcon : PencilIcon;

  return (
    <ExpandingToolbar
      tooltip="Drawing tools and camera"
      icon={
        <Icon style={{ color: selectedTab ? colors.accent : "white" }}>
          <IconName />
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
      <ToolGroup name={CAMERA_TAB_TYPE}>
        {cameraState != null && (
          <CameraInfo
            cameraState={cameraState}
            followOrientation={followOrientation}
            followTf={followTf}
            isPlaying={isPlaying}
            onAlignXYAxis={onAlignXYAxis}
            onCameraStateChange={onCameraStateChange}
            showCrosshair={showCrosshair}
          />
        )}
      </ToolGroup>
    </ExpandingToolbar>
  );
}

DrawingTools.defaultProps = {
  selectedPolygonEditFormat: EDIT_FORMAT.YAML,
};

export default React.memo<Props>(DrawingTools);
