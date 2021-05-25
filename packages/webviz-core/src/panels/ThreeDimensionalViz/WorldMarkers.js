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
import tinyColor from "tinycolor2";

import glTextAtlasLoader, { type TextAtlas } from "./utils/glTextAtlasLoader";
import { groupLinesIntoInstancedLineLists } from "./utils/groupingUtils";
import {
  OccupancyGrids,
  LaserScans,
  PointClouds,
  LinedConvexHulls,
} from "webviz-core/src/panels/ThreeDimensionalViz/commands";
import { projectItem } from "webviz-core/src/panels/ThreeDimensionalViz/commands/OverlayProjector";
import {
  LAYER_INDEX_TEXT,
  LAYER_INDEX_OCCUPANCY_GRIDS,
  ICON_BY_TYPE,
} from "webviz-core/src/panels/ThreeDimensionalViz/constants";
import type { Interactive } from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/types";
import type { ThreeDimensionalVizHooks } from "webviz-core/src/panels/ThreeDimensionalViz/SceneBuilder/types";
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
import { colorToRgbaString } from "webviz-core/src/util/colorUtils";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

const ICON_WRAPPER_SIZE = 24;
const ICON_SIZE = 16;
export const BG_COLOR = tinyColor(colors.DARK2)
  .setAlpha(0.75)
  .toRgbString();
const ICON_WIDTH = 28;

export const SIconWrapper = styled.div`
  box-shadow: 0px 1px 8px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.075);
  border-radius: ${ICON_WIDTH / 2}px;
  display: flex;
  overflow: hidden;
  align-items: center;
  background: ${BG_COLOR};
  position: absolute;
  top: 0;
  left: 0;
  cursor: pointer;
`;

export const SText = styled.span`
  margin-left: 4px;
  margin-right: 8px;
`;

export type MarkerWithInteractionData = Interactive<any>;
// Unfortunately, we call onIconClick with a nasty "drawable icon data" message, for which we have
// no good type. It bears a little resemblance to a parsed icon marker, though.
export type OnIconClick = (iconMarker: Interactive<OverlayIconMarker>, {| clientX: number, clientY: number |}) => void;
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
  hooks: ThreeDimensionalVizHooks,
  onIconClick: OnIconClick,
|};

const MIN_SCALE = 0.6;
const MIN_DISTANCE = 50;
const MAX_DISTANCE = 100;
// The icons will scale according to camera distance between MIN_DISTANCE and MAX_DISTANCE, from 100% to MIN_SCALE.
function getIconScaleByCameraDistance(distance: number): number {
  const effectiveIconDistance = clamp(distance, MIN_DISTANCE, MAX_DISTANCE);
  return 1 - ((effectiveIconDistance - MIN_DISTANCE) * (1 - MIN_SCALE)) / (MAX_DISTANCE - MIN_DISTANCE);
}

export function getIconStyles(
  distance: number
): {|
  iconWrapperPadding: number,
  scaledIconSize: number,
  scaledIconWrapperSize: number,
|} {
  const scale = getIconScaleByCameraDistance(distance);
  const scaledIconWrapperSize = Math.round(scale * ICON_WRAPPER_SIZE);
  const scaledIconSize = Math.round(scale * ICON_SIZE);
  const iconWrapperPadding = Math.floor((scaledIconWrapperSize - scaledIconSize) / 2);
  return {
    iconWrapperPadding,
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
  hooks,
  onIconClick,
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
  const additionalMarkers = hooks.renderAdditionalMarkers(rest);

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
  const { scaledIconWrapperSize, scaledIconSize, iconWrapperPadding } = useMemo(() => getIconStyles(cameraDistance), [
    cameraDistance,
  ]);

  return (
    <>
      <OccupancyGrids layerIndex={layerIndex + LAYER_INDEX_OCCUPANCY_GRIDS} getMapPalette={hooks.getMapPalette}>
        {grid}
      </OccupancyGrids>
      {additionalMarkers}
      {/* Render PointClouds first so other markers with the same zIndex can show on top of PointClouds. */}
      <PointClouds
        layerIndex={layerIndex}
        clearCachedMarkers={clearCachedMarkers}
        createPointCloudPositionBuffer={hooks.createPointCloudPositionBuffer}>
        {pointcloud}
      </PointClouds>
      <Arrows layerIndex={layerIndex}>{arrow}</Arrows>
      <Points layerIndex={layerIndex} useWorldSpaceSize={hooks.useWorldspacePointSize}>
        {points}
      </Points>
      <Triangles layerIndex={layerIndex}>{triangleList}</Triangles>
      <Spheres layerIndex={layerIndex}>{[...sphere, ...sphereList]}</Spheres>
      <Cylinders layerIndex={layerIndex}>{cylinder}</Cylinders>
      <Cubes layerIndex={layerIndex}>{[...cube, ...cubeList]}</Cubes>
      <hooks.PoseMarkers
        originalScaling={hooks.originalPoseScaling}
        updatedScaling={hooks.updatedPoseScaling}
        layerIndex={layerIndex}>
        {poseMarker}
      </hooks.PoseMarkers>
      <LaserScans layerIndex={layerIndex} laserScanVert={hooks.LaserScanVert}>
        {laserScan}
      </LaserScans>
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

      {/* TODO(useWorkerIn3DPanel): `<Overlay/>` will only render icons if the flag is off. Otherwise, we use `<IconOverlay/>` in `<Layout/>` */}
      <Overlay
        renderItem={({ item, coordinates, dimension }) => {
          const projectedItem = projectItem({ item, coordinates, dimension });
          if (!projectedItem) {
            return null;
          }
          const {
            textColor,
            name,
            text,
            markerStyle = {},
            iconOffset: { x = 0, y = 0 } = {},
            coordinates: [left, top],
            iconTypes,
          } = projectedItem;
          return (
            <SIconWrapper
              key={name}
              onClick={(ev: MouseEvent) => {
                ev.stopPropagation();
                onIconClick(item, { clientX: ev.clientX, clientY: ev.clientY });
              }}
              style={{
                ...markerStyle,
                color: colorToRgbaString(textColor),
                borderRadius: scaledIconWrapperSize / 2,
                padding: iconWrapperPadding,
                transform: `translate(${(left - scaledIconWrapperSize / 2 + x).toFixed()}px,${(
                  top -
                  scaledIconWrapperSize / 2 +
                  y
                ).toFixed()}px)`,
              }}>
              {iconTypes.map(({ icon_type, color }, idx) => {
                const SvgIcon = ICON_BY_TYPE[`${icon_type}`] || ICON_BY_TYPE.DEFAULT;
                let fill = colors.BLUE;
                if (color) {
                  const { r, g, b, a } = color; // Use color to control the background color of the icon.
                  fill = `rgba(${r * 255},${g * 255},${b * 255},${a})`;
                }
                return (
                  <SvgIcon key={`${icon_type}${idx}`} width={scaledIconSize} height={scaledIconSize} fill={fill} />
                );
              })}
              {text && <SText>{text}</SText>}
            </SIconWrapper>
          );
        }}>
        {overlayIcon}
      </Overlay>
    </>
  );
}
