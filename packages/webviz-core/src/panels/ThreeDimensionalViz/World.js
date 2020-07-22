// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useMemo, useState, useEffect, type Node } from "react";
import {
  Worldview,
  Arrows,
  Cubes,
  Cylinders,
  GLText,
  Lines,
  Points,
  Spheres,
  Triangles,
  FilledPolygons,
  type CameraState,
  type MouseHandler,
  createInstancedGetChildrenForHitmap,
} from "regl-worldview";

import glTextAtlasLoader, { type TextAtlas } from "./utils/glTextAtlasLoader";
import { groupLinesIntoInstancedLineLists } from "./utils/groupingUtils";
import { useExperimentalFeature } from "webviz-core/src/components/ExperimentalFeatures";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import {
  OccupancyGrids,
  LaserScans,
  PointClouds,
  PoseMarkers,
  LinedConvexHulls,
} from "webviz-core/src/panels/ThreeDimensionalViz/commands";
import { type WorldSearchTextProps, useGLText } from "webviz-core/src/panels/ThreeDimensionalViz/SearchText";
import inScreenshotTests from "webviz-core/src/stories/inScreenshotTests";
import type { TextMarker } from "webviz-core/src/types/Messages";
import type { MarkerCollector, MarkerProvider } from "webviz-core/src/types/Scene";

type Props = {|
  autoTextBackgroundColor: boolean,
  cameraState: CameraState,
  children?: Node,
  isPlaying: boolean,
  markerProviders: MarkerProvider[],
  onCameraStateChange: (CameraState) => void,
  onClick: MouseHandler,
  onDoubleClick: MouseHandler,
  onMouseDown?: MouseHandler,
  onMouseMove?: MouseHandler,
  onMouseUp?: MouseHandler,
  ...WorldSearchTextProps,
|};

function getMarkers(markerProviders: MarkerProvider[]) {
  const markers = {};
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

// Generate an alphabet for text makers with the most
// used ASCII characters to prevent recreating the texture
// atlas too many times for dynamic texts.
const ALPHABET = (() => {
  const start = 32; // SPACE
  const end = 125; // "}"
  return new Array(end - start + 1).fill().map((_, i) => String.fromCodePoint(start + i));
})();

const glTextAtlasPromise = glTextAtlasLoader();

type GLTextAtlasStatus = {
  status: "LOADING" | "LOADED",
  glTextAtlas: ?TextAtlas,
};

export default function World({
  onClick,
  autoTextBackgroundColor,
  children,
  onCameraStateChange,
  cameraState,
  isPlaying,
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
}: Props) {
  const getChildrenForHitmap = useMemo(() => createInstancedGetChildrenForHitmap(2), []);
  const {
    arrow,
    cube,
    cubeList,
    cylinder,
    filledPolygon,
    grid,
    instancedLineList,
    laserScan,
    linedConvexHull,
    lineList,
    lineStrip,
    pointcloud,
    points,
    poseMarker,
    sphere,
    sphereList,
    text,
    triangleList,
    ...rest
  } = getMarkers(markerProviders);
  const additionalMarkers = getGlobalHooks()
    .perPanelHooks()
    .ThreeDimensionalViz.renderAdditionalMarkers(rest);

  const textMarkers = useGLText({
    text: (text: TextMarker[]),
    setSearchTextMatches,
    searchText,
    searchTextOpen,
    selectedMatchIndex,
    searchTextMatches,
  });

  // GLTextAtlas download is shared among all instances of World, but we should only load the GLText command once we
  // have the pregenerated atlas available.
  const [glTextAtlasInfo, setGlTextAtlasInfo] = useState<GLTextAtlasStatus>({
    status: "LOADING",
    glTextAtlas: undefined,
  });
  useEffect(() => {
    glTextAtlasPromise.then((atlas) => {
      setGlTextAtlasInfo({ status: "LOADED", glTextAtlas: atlas });
    });
  }, []);

  // If 'groupLines' is enabled, we group all line strips and line lists
  // into as few markers as possible. Otherwise, just render them as is.
  const groupLines = useExperimentalFeature("groupLines");
  let groupedLines = [];
  let nonGroupedLines = [...lineList, ...lineStrip];
  if (groupLines) {
    groupedLines = groupLinesIntoInstancedLineLists(nonGroupedLines);
    nonGroupedLines = [];
  }

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
      onMouseUp={onMouseUp}>
      {children}
      <OccupancyGrids layerIndex={-1}>{grid}</OccupancyGrids>
      {additionalMarkers}
      <Lines>{nonGroupedLines}</Lines>
      <Arrows>{arrow}</Arrows>
      <Points>{points}</Points>
      <PointClouds>{pointcloud}</PointClouds>
      <Triangles>{triangleList}</Triangles>
      <Spheres>{[...sphere, ...sphereList]}</Spheres>
      <Cylinders>{cylinder}</Cylinders>
      <Cubes>{[...cube, ...cubeList]}</Cubes>
      <PoseMarkers>{poseMarker}</PoseMarkers>
      <LaserScans>{laserScan}</LaserScans>
      {glTextAtlasInfo.status === "LOADED" && (
        <GLText
          layerIndex={10}
          alphabet={ALPHABET}
          scaleInvariantFontSize={14}
          autoBackgroundColor={autoTextBackgroundColor}
          textAtlas={glTextAtlasInfo.glTextAtlas}>
          {textMarkers}
        </GLText>
      )}
      <FilledPolygons>{filledPolygon}</FilledPolygons>
      <Lines getChildrenForHitmap={getChildrenForHitmap}>{[...instancedLineList, ...groupedLines]}</Lines>
      <LinedConvexHulls>{linedConvexHull}</LinedConvexHulls>
    </Worldview>
  );
}
