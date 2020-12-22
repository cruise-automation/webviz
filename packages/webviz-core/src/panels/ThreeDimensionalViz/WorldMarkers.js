// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { clamp } from "lodash";
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
  Overlay,
} from "regl-worldview";
import styled from "styled-components";

import glTextAtlasLoader, { type TextAtlas } from "./utils/glTextAtlasLoader";
import { groupLinesIntoInstancedLineLists } from "./utils/groupingUtils";
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
  OverlayIconMarker,
} from "webviz-core/src/types/Messages";
import { deepParse, isBobject } from "webviz-core/src/util/binaryObjects";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

const ICON_WRAPPER_SIZE = 24;
const ICON_SIZE = 14;

export const SIconWrapper = styled.div`
  position: absolute;
  color: ${colors.LIGHT};
  box-shadow: 0px 0px 12px rgba(23, 34, 40, 0.7);
  overflow: hidden;
  pointer-events: none;
  top: 0;
  left: 0;
`;
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
  overlayIcon: Interactive<OverlayIconMarker>[],
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
  isDemoMode: boolean,
  cameraDistance: number,
  diffModeEnabled: boolean,
|};

const MIN_SCALE = 0.6;
const MIN_DISTANCE = 50;
const MAX_DISTANCE = 100;
// The icons will scale according to camera distance between MIN_DISTANCE and MAX_DISTANCE, from 100% to MIN_SCALE.
function getIconScaleByCameraDistance(distance: number): number {
  const effectiveIconDistance = clamp(distance, MIN_DISTANCE, MAX_DISTANCE);
  return 1 - ((effectiveIconDistance - MIN_DISTANCE) * (1 - MIN_SCALE)) / (MAX_DISTANCE - MIN_DISTANCE);
}

function getIconStyles(
  distance: number
): {|
  iconWrapperStyles: { [attr: string]: string | number },
  scaledIconSize: number,
  scaledIconWrapperSize: number,
|} {
  const scale = getIconScaleByCameraDistance(distance);
  const scaledIconWrapperSize = Math.round(scale * ICON_WRAPPER_SIZE);
  const scaledIconSize = Math.round(scale * ICON_SIZE);
  const padding = Math.floor((scaledIconWrapperSize - scaledIconSize) / 2);
  return {
    iconWrapperStyles: {
      padding,
      width: scaledIconWrapperSize,
      height: scaledIconWrapperSize,
      borderRadius: scaledIconWrapperSize,
    },
    scaledIconSize,
    scaledIconWrapperSize,
  };
}

export default function WorldMarkers({
  autoTextBackgroundColor,
  layerIndex,
  markersByType,
  clearCachedMarkers,
  cameraDistance,
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
    overlayIcon,
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
    let mounted = true;
    glTextAtlasPromise.then((atlas) => {
      if (mounted) {
        setGlTextAtlasInfo({ status: "LOADED", glTextAtlas: atlas });
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Group all line strips and line lists into as few markers as possible
  const groupedLines = groupLinesIntoInstancedLineLists([...lineList, ...lineStrip]);

  // Render smaller icons when camera is zoomed out.
  const { iconWrapperStyles, scaledIconWrapperSize, scaledIconSize } = useMemo(() => getIconStyles(cameraDistance), [
    cameraDistance,
  ]);

  const useWorldspacePointSize = getGlobalHooks()
    .perPanelHooks()
    .ThreeDimensionalViz.useWorldspacePointSize();

  return (
    <>
      <OccupancyGrids layerIndex={layerIndex + LAYER_INDEX_OCCUPANCY_GRIDS}>{grid}</OccupancyGrids>
      {additionalMarkers}
      {/* Render PointClouds first so other markers with the same zIndex can show on top of PointClouds. */}
      <PointClouds layerIndex={layerIndex} clearCachedMarkers={clearCachedMarkers}>
        {pointcloud}
      </PointClouds>
      <Arrows layerIndex={layerIndex}>{arrow}</Arrows>
      <Points layerIndex={layerIndex} useWorldSpaceSize={useWorldspacePointSize}>
        {points}
      </Points>
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
      <Overlay
        renderItem={({ item, coordinates, index, dimension: { width, height } }) => {
          if (!coordinates) {
            return null;
          }
          const [left, top] = coordinates;
          if (left < -10 || top < -10 || left > width + 10 || top > height + 10) {
            return null; // Don't render anything that's too far outside of the canvas
          }
          const originalMsg = item.interactionData?.originalMessage || {};
          const parsedMsg = isBobject(originalMsg) ? deepParse(originalMsg) : originalMsg;

          const metadata = parsedMsg?.metadata;
          if (!metadata) {
            return;
          }
          const { name, markerStyle = {}, iconOffset: { x = 0, y = 0 } = {} } = metadata;
          const iconsByClassification = getGlobalHooks().perPanelHooks().ThreeDimensionalViz.iconsByClassification;
          const SvgIcon = iconsByClassification[name] || iconsByClassification.DEFAULT;

          return (
            <SIconWrapper
              key={index}
              style={{
                ...markerStyle,
                ...iconWrapperStyles,
                transform: `translate(${(left - scaledIconWrapperSize / 2 + x).toFixed()}px,${(
                  top -
                  scaledIconWrapperSize / 2 +
                  y
                ).toFixed()}px)`,
              }}>
              <SvgIcon fill="white" width={scaledIconSize} height={scaledIconSize} />
            </SIconWrapper>
          );
        }}>
        {overlayIcon}
      </Overlay>
    </>
  );
}
