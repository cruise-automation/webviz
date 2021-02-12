// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { type Node, forwardRef } from "react";
import { Worldview, type CameraState, type MouseHandler, DEFAULT_CAMERA_STATE } from "regl-worldview";

import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import { LAYER_INDEX_DEFAULT_BASE } from "webviz-core/src/panels/ThreeDimensionalViz/constants";
import { type WorldSearchTextProps, useGLText } from "webviz-core/src/panels/ThreeDimensionalViz/SearchText";
import { withDiffMode } from "webviz-core/src/panels/ThreeDimensionalViz/utils/diffModeUtils";
import withHighlights from "webviz-core/src/panels/ThreeDimensionalViz/withWorldMarkerHighlights.js";
import WorldMarkers, { type InteractiveMarkersByType } from "webviz-core/src/panels/ThreeDimensionalViz/WorldMarkers";
import inScreenshotTests from "webviz-core/src/stories/inScreenshotTests";
import type { MarkerCollector, MarkerProvider } from "webviz-core/src/types/Scene";

type Props = {|
  autoTextBackgroundColor: boolean,
  cameraState: CameraState,
  children?: Node,
  isPlaying: boolean,
  isDemoMode: boolean,
  markerProviders: MarkerProvider[],
  onCameraStateChange: (CameraState) => void,
  onClick: MouseHandler,
  onDoubleClick: MouseHandler,
  onMouseDown?: MouseHandler,
  onMouseMove?: MouseHandler,
  onMouseUp?: MouseHandler,
  diffModeEnabled: boolean,
  ...WorldSearchTextProps,
|};

function getMarkers(markerProviders: MarkerProvider[]): InteractiveMarkersByType {
  const markers: InteractiveMarkersByType = {
    arrow: [],
    cube: [],
    cubeList: [],
    cylinder: [],
    filledPolygon: [],
    glText: [],
    grid: [],
    instancedLineList: [],
    laserScan: [],
    linedConvexHull: [],
    lineList: [],
    lineStrip: [],
    overlayIcon: [],
    pointcloud: [],
    points: [],
    poseMarker: [],
    sphere: [],
    sphereList: [],
    text: [],
    triangleList: [],
  };

  const collector = {};
  getGlobalHooks()
    .perPanelHooks()
    .ThreeDimensionalViz.allSupportedMarkers.forEach((field) => {
      if (!markers[field]) {
        markers[field] = [];
      }
      collector[field] = (o) => markers[field].push(o);
    });

  markerProviders.forEach((provider) => {
    if (provider) {
      provider.renderMarkers(((collector: any): MarkerCollector));
    }
  });

  return markers;
}

// Wrap the WorldMarkers in HoC(s)
const WrappedWorldMarkers = withHighlights(withDiffMode(WorldMarkers));

function World(
  {
    onClick,
    autoTextBackgroundColor,
    children,
    onCameraStateChange,
    diffModeEnabled,
    cameraState,
    isPlaying,
    isDemoMode,
    markerProviders,
    onDoubleClick,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    setSearchTextMatches,
    searchText,
    searchTextOpen,
    selectedMatchIndex,
    searchTextMatches,
  }: Props,
  ref: Worldview
) {
  const markersByType = getMarkers(markerProviders);
  const { text = [] } = markersByType;
  const processedMarkersByType = {
    ...markersByType,
    text: [],
    glText: useGLText({
      text,
      setSearchTextMatches,
      searchText,
      searchTextOpen,
      selectedMatchIndex,
      searchTextMatches,
    }),
  };

  return (
    <Worldview
      cameraState={cameraState}
      enableStackedObjectEvents={!isPlaying}
      hideDebug={inScreenshotTests()}
      onCameraStateChange={onCameraStateChange}
      // Rendering the hitmap is an expensive operation and we want to avoid
      // doing it when the user is dragging the view with the mouse. By ignoring
      // these events, the only way to select an object is when receiving an "onClick" event.
      disableHitmapForEvents={["onMouseDown", "onMouseMove", "onMouseUp"]}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      resolutionScale={isDemoMode ? 2 : 1}
      ref={ref}
      contextAttributes={{ preserveDrawingBuffer: true }}>
      {children}
      <WrappedWorldMarkers
        {...{
          autoTextBackgroundColor,
          markersByType: processedMarkersByType,
          layerIndex: LAYER_INDEX_DEFAULT_BASE,
          clearCachedMarkers: false,
          isDemoMode,
          cameraDistance: cameraState.distance || DEFAULT_CAMERA_STATE.distance,
          diffModeEnabled,
        }}
      />
    </Worldview>
  );
}

export default forwardRef<typeof Worldview, _>(World);
