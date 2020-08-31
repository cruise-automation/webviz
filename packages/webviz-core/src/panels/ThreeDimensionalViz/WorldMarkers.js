// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useMemo, useState, useEffect } from "react";
import {
  Arrows,
  Cubes,
  Cylinders,
  GLText,
  Points,
  Spheres,
  Triangles,
  Lines,
  FilledPolygons,
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
import { LAYER_INDEX_TEXT, LAYER_INDEX_OCCUPANCY_GRIDS } from "webviz-core/src/panels/ThreeDimensionalViz/constants";
import type { Interactive } from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/types";
import { type GLTextMarker } from "webviz-core/src/panels/ThreeDimensionalViz/SearchText";
import type {
  BaseMarker,
  CubeListMarker,
  CubeMarker,
  CylinderMarker,
  LineListMarker,
  LineStripMarker,
  PointsMarker,
  SphereListMarker,
  SphereMarker,
  TextMarker,
} from "webviz-core/src/types/Messages";

export type MarkerWithInteractionData = Interactive<any>;

export type InteractiveMarkersByType = {
  arrow: MarkerWithInteractionData[],
  cube: Interactive<CubeMarker>[],
  cubeList: Interactive<CubeListMarker>[],
  cylinder: Interactive<CylinderMarker>[],
  filledPolygon: Interactive<SphereMarker>[],
  glText: Interactive<GLTextMarker>[],
  grid: Interactive<BaseMarker>[],
  instancedLineList: Interactive<BaseMarker>[],
  laserScan: Interactive<BaseMarker>[],
  linedConvexHull: Interactive<BaseMarker>[],
  lineList: Interactive<LineListMarker>[],
  lineStrip: Interactive<LineStripMarker>[],
  pointcloud: Interactive<SphereMarker>[],
  points: Interactive<PointsMarker>[],
  poseMarker: Interactive<BaseMarker>[],
  sphere: Interactive<SphereMarker>[],
  sphereList: Interactive<SphereListMarker>[],
  text: Interactive<TextMarker>[],
  triangleList: MarkerWithInteractionData[],
};

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

export type WorldMarkerProps = {|
  autoTextBackgroundColor: boolean,
  layerIndex?: number,
  markersByType: InteractiveMarkersByType,
  clearCachedMarkers: boolean,
|};

export default function WorldMarkers({
  autoTextBackgroundColor,
  layerIndex,
  markersByType,
  clearCachedMarkers,
}: WorldMarkerProps) {
  const getChildrenForHitmap = useMemo(() => createInstancedGetChildrenForHitmap(1), []);
  const {
    arrow,
    cube,
    cubeList,
    cylinder,
    filledPolygon,
    glText,
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
    triangleList,
    ...rest
  } = markersByType;
  const additionalMarkers = getGlobalHooks()
    .perPanelHooks()
    .ThreeDimensionalViz.renderAdditionalMarkers(rest);

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
    <>
      <OccupancyGrids layerIndex={layerIndex + LAYER_INDEX_OCCUPANCY_GRIDS}>{grid}</OccupancyGrids>
      {additionalMarkers}
      <Lines layerIndex={layerIndex}>{nonGroupedLines}</Lines>
      <Arrows layerIndex={layerIndex}>{arrow}</Arrows>
      <Points layerIndex={layerIndex}>{points}</Points>
      <PointClouds layerIndex={layerIndex} clearCachedMarkers={clearCachedMarkers}>
        {pointcloud}
      </PointClouds>
      <Triangles layerIndex={layerIndex}>{triangleList}</Triangles>
      <Spheres layerIndex={layerIndex}>{[...sphere, ...sphereList]}</Spheres>
      <Cylinders layerIndex={layerIndex}>{cylinder}</Cylinders>
      <Cubes layerIndex={layerIndex}>{[...cube, ...cubeList]}</Cubes>
      <PoseMarkers layerIndex={layerIndex}>{poseMarker}</PoseMarkers>
      <LaserScans layerIndex={layerIndex}>{laserScan}</LaserScans>
      {glTextAtlasInfo.status === "LOADED" && (
        <GLText
          layerIndex={layerIndex + LAYER_INDEX_TEXT}
          alphabet={ALPHABET}
          scaleInvariantFontSize={14}
          autoBackgroundColor={autoTextBackgroundColor}
          textAtlas={glTextAtlasInfo.glTextAtlas}>
          {glText}
        </GLText>
      )}
      <FilledPolygons layerIndex={layerIndex}>{filledPolygon}</FilledPolygons>
      <Lines getChildrenForHitmap={getChildrenForHitmap} layerIndex={layerIndex}>
        {[...instancedLineList, ...groupedLines]}
      </Lines>
      <LinedConvexHulls layerIndex={layerIndex}>{linedConvexHull}</LinedConvexHulls>
    </>
  );
}
