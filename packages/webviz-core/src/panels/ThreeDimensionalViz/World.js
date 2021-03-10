// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { type Node, forwardRef } from "react";
import {
  Worldview,
  OffscreenWorldview,
  type CameraState,
  type MouseHandler,
  DEFAULT_CAMERA_STATE,
} from "regl-worldview";

import OverlayProjector from "webviz-core/src/panels/ThreeDimensionalViz/commands/OverlayProjector";
import { LAYER_INDEX_DEFAULT_BASE } from "webviz-core/src/panels/ThreeDimensionalViz/constants";
import Crosshair from "webviz-core/src/panels/ThreeDimensionalViz/Crosshair";
import MeasureMarker, { type MeasurePoints } from "webviz-core/src/panels/ThreeDimensionalViz/MeasureMarker";
import type { ThreeDimensionalVizHooks } from "webviz-core/src/panels/ThreeDimensionalViz/SceneBuilder/types";
import { withDiffMode } from "webviz-core/src/panels/ThreeDimensionalViz/utils/diffModeUtils";
import {
  TextHighlighter,
  type WorldSearchTextProps,
} from "webviz-core/src/panels/ThreeDimensionalViz/utils/searchTextUtils";
import withHighlights from "webviz-core/src/panels/ThreeDimensionalViz/withWorldMarkerHighlights.js";
import WorldMarkers, {
  type InteractiveMarkersByType,
  type OnIconClick,
} from "webviz-core/src/panels/ThreeDimensionalViz/WorldMarkers";
import inScreenshotTests from "webviz-core/src/stories/inScreenshotTests";
import type { MarkerCollector, MarkerProvider } from "webviz-core/src/types/Scene";

type Props = {|
  autoTextBackgroundColor: boolean,
  cameraState: CameraState,
  children?: Node,
  hooks: ThreeDimensionalVizHooks,
  isPlaying: boolean,
  isDemoMode: boolean,
  markerProviders: MarkerProvider[],
  onCameraStateChange: (CameraState) => void,
  onClick: MouseHandler,
  onIconClick: OnIconClick,
  onDoubleClick: MouseHandler,
  onMouseDown?: MouseHandler,
  onMouseMove?: MouseHandler,
  onMouseUp?: MouseHandler,
  diffModeEnabled: boolean,
  canvas?: HTMLCanvasElement,
  setOverlayIcons: (any) => void,
  showCrosshair: ?boolean,
  measurePoints: MeasurePoints,
  ...WorldSearchTextProps,
|};

function getMarkers(markerProviders: MarkerProvider[], hooks: ThreeDimensionalVizHooks): InteractiveMarkersByType {
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
  hooks.allSupportedMarkers.forEach((field) => {
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
    hooks,
    isPlaying,
    isDemoMode,
    markerProviders,
    onDoubleClick,
    onIconClick,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    setSearchTextMatches,
    searchText,
    searchTextOpen,
    selectedMatchIndex,
    searchTextMatches,
    canvas,
    setOverlayIcons,
    showCrosshair,
    measurePoints,
  }: Props,
  ref: Worldview
) {
  const markersByType = getMarkers(markerProviders, hooks);
  const { text = [] } = markersByType;
  const textHighlighter = React.useMemo(() => new TextHighlighter(setSearchTextMatches), [setSearchTextMatches]);
  const processedMarkersByType = {
    ...markersByType,
    text: [],
    glText: textHighlighter.highlightText({
      text,
      searchText,
      searchTextOpen,
      selectedMatchIndex,
      searchTextMatches,
    }),
  };

  const WorldviewImpl = canvas ? OffscreenWorldview : Worldview;
  const offscreenProps = canvas ? { canvas, width: canvas.width, height: canvas.height, top: 0, left: 0 } : {};

  const { overlayIcon } = processedMarkersByType;

  return (
    <WorldviewImpl
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
      contextAttributes={{ preserveDrawingBuffer: true }}
      {...offscreenProps}>
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
          hooks,
          onIconClick,
        }}
      />
      {!!canvas && <OverlayProjector setOverlayIcons={setOverlayIcons}>{overlayIcon}</OverlayProjector>}
      {!cameraState.perspective && showCrosshair && <Crosshair cameraState={cameraState} hooks={hooks} />}
      <MeasureMarker measurePoints={measurePoints} />
    </WorldviewImpl>
  );
}

export default forwardRef<typeof Worldview, _>(World);
