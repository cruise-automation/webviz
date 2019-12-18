// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import cx from "classnames";
import React, { useMemo } from "react";
import { PolygonBuilder, type MouseEventObject, type Polygon } from "regl-worldview";

import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import Crosshair from "webviz-core/src/panels/ThreeDimensionalViz/Crosshair";
import DrawingTools, {
  CAMERA_TAB_TYPE,
  type DrawingTabType,
} from "webviz-core/src/panels/ThreeDimensionalViz/DrawingTools";
import MeasuringTool, { type MeasureInfo } from "webviz-core/src/panels/ThreeDimensionalViz/DrawingTools/MeasuringTool";
import FollowTFControl from "webviz-core/src/panels/ThreeDimensionalViz/FollowTFControl";
import Interactions, { type InteractionData } from "webviz-core/src/panels/ThreeDimensionalViz/Interactions";
import { type LayoutToolbarSharedProps } from "webviz-core/src/panels/ThreeDimensionalViz/Layout";
import styles from "webviz-core/src/panels/ThreeDimensionalViz/Layout.module.scss";
import MainToolbar from "webviz-core/src/panels/ThreeDimensionalViz/MainToolbar";
import MeasureMarker from "webviz-core/src/panels/ThreeDimensionalViz/MeasureMarker";

type Props = {|
  ...LayoutToolbarSharedProps,
  selectedPolygonEditFormat: "json" | "yaml",
  showCrosshair: ?boolean,
  debug: boolean,
  drawingTabType: ?DrawingTabType,
  interactionData: ?InteractionData,
  isDrawing: boolean,
  measureInfo: MeasureInfo,
  measuringElRef: { current: ?MeasuringTool },
  onClearSelectedObject: () => void,
  onSetDrawingTabType: (?DrawingTabType) => void,
  onSetPolygons: (polygons: Polygon[]) => void,
  onToggleCameraMode: () => void,
  onToggleDebug: () => void,
  polygonBuilder: PolygonBuilder,
  selectedObject: ?MouseEventObject,
  setMeasureInfo: (MeasureInfo) => void,
|};

function LayoutToolbar({
  cameraState,
  debug,
  drawingTabType,
  followOrientation,
  followTf,
  interactionData,
  isDrawing,
  isPlaying,
  measureInfo,
  measuringElRef,
  onAlignXYAxis,
  onCameraStateChange,
  onClearSelectedObject,
  onFollowChange,
  onSetDrawingTabType,
  onSetPolygons,
  onToggleCameraMode,
  onToggleDebug,
  polygonBuilder,
  saveConfig,
  selectedObject,
  selectedPolygonEditFormat,
  setMeasureInfo,
  showCrosshair,
  transforms,
}: Props) {
  const additionalToolbarItemsElem = useMemo(
    () => {
      const AdditionalToolbarItems = getGlobalHooks().perPanelHooks().ThreeDimensionalViz.AdditionalToolbarItems;
      return (
        <div className={cx(styles.buttons, styles.cartographer)}>
          <AdditionalToolbarItems transforms={transforms} />
        </div>
      );
    },
    [transforms]
  );
  return (
    <>
      <MeasuringTool
        ref={measuringElRef}
        measureState={measureInfo.measureState}
        measurePoints={measureInfo.measurePoints}
        onMeasureInfoChange={setMeasureInfo}
      />
      <div className={cx(styles.toolbar, styles.right)}>
        <div className={styles.buttons}>
          <FollowTFControl
            transforms={transforms}
            tfToFollow={followTf ? followTf : undefined}
            followOrientation={followOrientation}
            onFollowChange={onFollowChange}
          />
        </div>
        <MainToolbar
          measureInfo={measureInfo}
          measuringTool={measuringElRef.current}
          perspective={cameraState.perspective}
          debug={debug}
          onToggleCameraMode={onToggleCameraMode}
          onToggleDebug={onToggleDebug}
        />
        {measuringElRef.current && measuringElRef.current.measureDistance}
        <Interactions
          isDrawing={isDrawing}
          interactionData={interactionData}
          onClearSelectedObject={onClearSelectedObject}
          selectedObject={selectedObject}
        />
        <DrawingTools
          // Save some unnecessary re-renders by not passing in the constantly changing cameraState unless it's needed
          cameraState={drawingTabType === CAMERA_TAB_TYPE ? cameraState : null}
          followOrientation={followOrientation}
          followTf={followTf}
          isPlaying={isPlaying}
          onAlignXYAxis={onAlignXYAxis}
          onCameraStateChange={onCameraStateChange}
          onSetPolygons={onSetPolygons}
          polygonBuilder={polygonBuilder}
          saveConfig={saveConfig}
          selectedPolygonEditFormat={selectedPolygonEditFormat}
          onSetDrawingTabType={onSetDrawingTabType}
          showCrosshair={!!showCrosshair}
        />
        {additionalToolbarItemsElem}
      </div>
      {!cameraState.perspective && showCrosshair && <Crosshair cameraState={cameraState} />}
      <MeasureMarker measurePoints={measureInfo.measurePoints} />
    </>
  );
}

export default React.memo<Props>(LayoutToolbar);
