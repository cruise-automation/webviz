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

import { useExperimentalFeature } from "webviz-core/src/components/ExperimentalFeatures";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import CameraInfo from "webviz-core/src/panels/ThreeDimensionalViz/CameraInfo";
import Crosshair from "webviz-core/src/panels/ThreeDimensionalViz/Crosshair";
import DrawingTools, { type DrawingTabType } from "webviz-core/src/panels/ThreeDimensionalViz/DrawingTools";
import MeasuringTool, { type MeasureInfo } from "webviz-core/src/panels/ThreeDimensionalViz/DrawingTools/MeasuringTool";
import FollowTFControl from "webviz-core/src/panels/ThreeDimensionalViz/FollowTFControl";
import GlobalVariableStyles from "webviz-core/src/panels/ThreeDimensionalViz/GlobalVariableStyles";
import Interactions, { type InteractionData } from "webviz-core/src/panels/ThreeDimensionalViz/Interactions";
import styles from "webviz-core/src/panels/ThreeDimensionalViz/Layout.module.scss";
import MainToolbar from "webviz-core/src/panels/ThreeDimensionalViz/MainToolbar";
import MeasureMarker from "webviz-core/src/panels/ThreeDimensionalViz/MeasureMarker";
import SearchText, { type SearchTextProps } from "webviz-core/src/panels/ThreeDimensionalViz/SearchText";
import {
  type ColorOverridesByGlobalVariableName,
  type LayoutToolbarSharedProps,
} from "webviz-core/src/panels/ThreeDimensionalViz/TopicTree/Layout";

type Props = {|
  ...LayoutToolbarSharedProps,
  autoSyncCameraState: boolean,
  debug: boolean,
  isDrawing: boolean,
  interactionData: ?InteractionData,
  measureInfo: MeasureInfo,
  measuringElRef: { current: ?MeasuringTool },
  onClearSelectedObject: () => void,
  setMeasureInfo: (MeasureInfo) => void,
  onSetDrawingTabType: (?DrawingTabType) => void,
  onSetPolygons: (polygons: Polygon[]) => void,
  onToggleCameraMode: () => void,
  onToggleDebug: () => void,
  polygonBuilder: PolygonBuilder,
  rootTf: ?string,
  selectedObject: ?MouseEventObject,
  selectedPolygonEditFormat: "json" | "yaml",
  showCrosshair: ?boolean,
  colorOverridesByGlobalVariable: ColorOverridesByGlobalVariableName,
  setColorOverridesByGlobalVariable: (ColorOverridesByGlobalVariableName) => void,
  ...SearchTextProps,
|};

function LayoutToolbar({
  autoSyncCameraState,
  cameraState,
  debug,
  isDrawing,
  followOrientation,
  followTf,
  interactionData,
  isPlaying,
  measureInfo,
  measuringElRef,
  onAlignXYAxis,
  onCameraStateChange,
  onClearSelectedObject,
  onFollowChange,
  setMeasureInfo,
  onSetDrawingTabType,
  onSetPolygons,
  onToggleCameraMode,
  onToggleDebug,
  polygonBuilder,
  rootTf,
  saveConfig,
  searchInputRef,
  searchText,
  searchTextMatches,
  searchTextOpen,
  selectedMatchIndex,
  selectedObject,
  selectedPolygonEditFormat,
  setSearchText,
  setSearchTextMatches,
  setSelectedMatchIndex,
  showCrosshair,
  targetPose,
  toggleSearchTextOpen,
  transforms,
  colorOverridesByGlobalVariable,
  setColorOverridesByGlobalVariable,
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
  const highlightMarkersThatMatchGlobalVariables = useExperimentalFeature("highlightGlobalVariableMatchingMarkers");

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
          <SearchText
            searchTextOpen={searchTextOpen}
            toggleSearchTextOpen={toggleSearchTextOpen}
            searchText={searchText}
            setSearchText={setSearchText}
            setSearchTextMatches={setSearchTextMatches}
            searchTextMatches={searchTextMatches}
            searchInputRef={searchInputRef}
            setSelectedMatchIndex={setSelectedMatchIndex}
            selectedMatchIndex={selectedMatchIndex}
            onCameraStateChange={onCameraStateChange}
            cameraState={cameraState}
            transforms={transforms}
            rootTf={rootTf}
            onFollowChange={onFollowChange}
          />
        </div>
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
        {highlightMarkersThatMatchGlobalVariables && (
          <GlobalVariableStyles
            colorOverridesByGlobalVariable={colorOverridesByGlobalVariable}
            setColorOverridesByGlobalVariable={setColorOverridesByGlobalVariable}
          />
        )}
        <Interactions
          isDrawing={isDrawing}
          interactionData={interactionData}
          onClearSelectedObject={onClearSelectedObject}
          selectedObject={selectedObject}
        />
        <DrawingTools
          onSetPolygons={onSetPolygons}
          polygonBuilder={polygonBuilder}
          saveConfig={saveConfig}
          selectedPolygonEditFormat={selectedPolygonEditFormat}
          onSetDrawingTabType={onSetDrawingTabType}
        />
        <CameraInfo
          cameraState={cameraState}
          targetPose={targetPose}
          followOrientation={followOrientation}
          followTf={followTf}
          isPlaying={isPlaying}
          onAlignXYAxis={onAlignXYAxis}
          onCameraStateChange={onCameraStateChange}
          showCrosshair={!!showCrosshair}
          autoSyncCameraState={autoSyncCameraState}
        />
        {additionalToolbarItemsElem}
      </div>
      {!cameraState.perspective && showCrosshair && <Crosshair cameraState={cameraState} />}
      <MeasureMarker measurePoints={measureInfo.measurePoints} />
    </>
  );
}

export default React.memo<Props>(LayoutToolbar);
