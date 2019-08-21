// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import CameraControlIcon from "@mdi/svg/svg/camera-control.svg";
import PencilIcon from "@mdi/svg/svg/pencil.svg";
import { keyBy } from "lodash";
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

export type DrawingType = "Polygons" | "Camera";

type Config = {
  key: string,
  type: DrawingType,
  icon: string,
};
// create an config object based on type key so we can access fields easily using DRAWING_CONFIG.Polygon.type
export const DRAWING_CONFIG: { [type: DrawingType]: Config } = keyBy(
  [
    {
      key: "p",
      type: "Polygons",
      icon: PencilIcon,
    },
    {
      key: "c",
      type: "Camera",
      icon: CameraControlIcon,
    },
  ],
  (config: Config) => config.type
);

export type onSetType = (?DrawingType) => void;
export type Point2D = {| x: number, y: number |};
type Props = {
  onCameraStateChange: (CameraState) => void,
  onSetPolygons: (polygons: Polygon[]) => void,
  polygonBuilder: PolygonBuilder,
  selectedPolygonEditFormat: EditFormat,
  setType: (?DrawingType) => void,
  type: ?DrawingType,
  // Camera state is optional here because we want to avoid passing it in unless necessary: otherwise it would lead to
  // re-renders on every camera state change.
  cameraState: ?$Shape<CameraState>,
} & CameraInfoPropsWithoutCameraState;

// add more drawing shapes later, e.g. Grid, Axes, Crosshairs
function DrawingTools({
  cameraState,
  followOrientation,
  followTf,
  onAlignXYAxis,
  onCameraStateChange,
  onSetPolygons,
  polygonBuilder,
  selectedPolygonEditFormat,
  setType,
  showCrosshair,
  type,
}: Props) {
  const config = (type && DRAWING_CONFIG[type]) || DRAWING_CONFIG.Polygons;
  const IconName = type ? config.icon : PencilIcon;

  return (
    <ExpandingToolbar
      tooltip="Drawing tools and camera"
      icon={
        <Icon style={{ color: type ? colors.accent : "white" }}>
          <IconName />
        </Icon>
      }
      className={styles.buttons}
      selectedTab={type}
      onSelectTab={(newSelectedTab) => setType(newSelectedTab)}>
      <ToolGroup name={DRAWING_CONFIG.Polygons.type}>
        <Polygons
          onSetPolygons={onSetPolygons}
          polygonBuilder={polygonBuilder}
          selectedPolygonEditFormat={selectedPolygonEditFormat}
        />
      </ToolGroup>
      <ToolGroup name={DRAWING_CONFIG.Camera.type}>
        {cameraState != null && (
          <CameraInfo
            cameraState={cameraState}
            followOrientation={followOrientation}
            followTf={followTf}
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
