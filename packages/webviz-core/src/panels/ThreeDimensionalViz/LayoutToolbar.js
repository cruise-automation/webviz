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
import CameraInfo from "webviz-core/src/panels/ThreeDimensionalViz/CameraInfo";
import DrawingTools, { type DrawingTabType } from "webviz-core/src/panels/ThreeDimensionalViz/DrawingTools";
import MeasuringTool, { type MeasureInfo } from "webviz-core/src/panels/ThreeDimensionalViz/DrawingTools/MeasuringTool";
import FollowTFControl from "webviz-core/src/panels/ThreeDimensionalViz/FollowTFControl";
import Interactions from "webviz-core/src/panels/ThreeDimensionalViz/Interactions";
import type { TabType } from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/Interactions";
import { type LayoutToolbarSharedProps } from "webviz-core/src/panels/ThreeDimensionalViz/Layout";
import styles from "webviz-core/src/panels/ThreeDimensionalViz/Layout.module.scss";
import MainToolbar from "webviz-core/src/panels/ThreeDimensionalViz/MainToolbar";
import SearchText, { type SearchTextProps } from "webviz-core/src/panels/ThreeDimensionalViz/SearchText";

type Props = {|
  ...LayoutToolbarSharedProps,
  autoSyncCameraState: boolean,
  debug: boolean,
  interactionsTabType: ?TabType,
  measureInfo: MeasureInfo,
  measuringElRef: { current: ?MeasuringTool },
  onSetDrawingTabType: (?DrawingTabType) => void,
  onSetPolygons: (polygons: Polygon[]) => void,
  onToggleCameraMode: () => void,
  onToggleDebug: () => void,
  polygonBuilder: PolygonBuilder,
  selectedObject: ?MouseEventObject,
  selectedPolygonEditFormat: "json" | "yaml",
  setInteractionsTabType: (?TabType) => void,
  setMeasureInfo: (MeasureInfo) => void,
  showCrosshair: ?boolean,
  isHidden: boolean,
  findTopicInTopicTree: (string) => void,
  ...SearchTextProps,
|};

function LayoutToolbar({
  autoSyncCameraState,
  cameraState,
  debug,
  followOrientation,
  followTf,
  interactionsTabType,
  isPlaying,
  measureInfo,
  measuringElRef,
  onAlignXYAxis,
  onCameraStateChange,
  onFollowChange,
  onSetDrawingTabType,
  onSetPolygons,
  onToggleCameraMode,
  onToggleDebug,
  polygonBuilder,
  saveConfig,
  searchInputRef,
  searchText,
  searchTextMatches,
  searchTextOpen,
  searchTextWithInlinedVariables,
  selectedMatchIndex,
  selectedObject,
  selectedPolygonEditFormat,
  findTopicInTopicTree,
  setInteractionsTabType,
  setMeasureInfo,
  setSearchText,
  setSearchTextMatches,
  setSelectedMatchIndex,
  showCrosshair,
  isHidden,
  targetPose,
  toggleSearchTextOpen,
  transforms,
}: Props) {
  const additionalToolbarItemsElem = useMemo(() => {
    const AdditionalToolbarItems = getGlobalHooks().perPanelHooks().ThreeDimensionalViz.AdditionalToolbarItems;
    return (
      <div className={cx(styles.buttons, styles.cartographer)}>
        <AdditionalToolbarItems transforms={transforms} />
      </div>
    );
  }, [transforms]);

  return isHidden ? null : (
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
            searchTextWithInlinedVariables={searchTextWithInlinedVariables}
            searchText={searchText}
            setSearchText={setSearchText}
            setSearchTextMatches={setSearchTextMatches}
            searchTextMatches={searchTextMatches}
            searchInputRef={searchInputRef}
            setSelectedMatchIndex={setSelectedMatchIndex}
            selectedMatchIndex={selectedMatchIndex}
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
        <Interactions
          findTopicInTopicTree={findTopicInTopicTree}
          selectedObject={selectedObject}
          interactionsTabType={interactionsTabType}
          setInteractionsTabType={setInteractionsTabType}
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
    </>
  );
}

export default React.memo<Props>(LayoutToolbar);
