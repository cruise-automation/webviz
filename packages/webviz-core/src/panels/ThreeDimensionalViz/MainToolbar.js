// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import BugIcon from "@mdi/svg/svg/bug.svg";
import RulerIcon from "@mdi/svg/svg/ruler.svg";
import Video3dIcon from "@mdi/svg/svg/video-3d.svg";
import * as React from "react";

import Button from "webviz-core/src/components/Button";
import Icon from "webviz-core/src/components/Icon";
import MeasuringTool, { type MeasureInfo } from "webviz-core/src/panels/ThreeDimensionalViz/DrawingTools/MeasuringTool";
import styles from "webviz-core/src/panels/ThreeDimensionalViz/Layout.module.scss";
import colors from "webviz-core/src/styles/colors.module.scss";

type Props = {
  measuringTool: ?MeasuringTool,
  measureInfo: MeasureInfo,
  perspective: boolean,
  debug: boolean,
  onToggleCameraMode: () => void,
  onToggleDebug: () => void,
};

function MainToolbar({
  measuringTool,
  measureInfo: { measureState },
  debug,
  onToggleCameraMode,
  onToggleDebug,
  perspective = false,
}: Props) {
  const cameraModeTip = perspective ? "Switch to 2D camera" : "Switch to 3D camera";
  const measureActive = measureState === "place-start" || measureState === "place-finish";
  return (
    <div className={styles.buttons}>
      <Button tooltip={cameraModeTip} onClick={onToggleCameraMode}>
        <Icon style={{ color: perspective ? colors.accent : "white" }} dataTest={`MainToolbar-toggleCameraMode`}>
          <Video3dIcon />
        </Icon>
      </Button>
      <Button
        disabled={perspective}
        tooltip={
          perspective
            ? "Switch to 2D Camera to Measure Distance"
            : measureActive
            ? "Cancel Measuring"
            : "Measure Distance"
        }
        onClick={measuringTool ? measuringTool.toggleMeasureState : undefined}>
        <Icon
          style={{
            color: measureActive ? colors.accent : perspective ? undefined : "white",
          }}>
          <RulerIcon />
        </Icon>
      </Button>
      {process.env.NODE_ENV === "development" && (
        <Button tooltip="Debug" onClick={onToggleDebug}>
          <Icon style={{ color: debug ? colors.accent : "white" }}>
            <BugIcon />
          </Icon>
        </Button>
      )}
    </div>
  );
}

export default React.memo<Props>(MainToolbar);
