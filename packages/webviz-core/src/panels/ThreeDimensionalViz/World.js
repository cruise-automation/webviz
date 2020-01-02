// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useMemo, type Node } from "react";
import {
  Worldview,
  Arrows,
  Cubes,
  Cylinders,
  GLText,
  Lines,
  Points,
  Spheres,
  Text,
  Triangles,
  FilledPolygons,
  type CameraState,
  type MouseHandler,
  createInstancedGetChildrenForHitmap,
} from "regl-worldview";

import { useExperimentalFeature } from "webviz-core/src/components/ExperimentalFeatures";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import {
  OccupancyGrids,
  LaserScans,
  PointClouds,
  PoseMarkers,
  LinedConvexHulls,
} from "webviz-core/src/panels/ThreeDimensionalViz/commands";
import inScreenshotTests from "webviz-core/src/stories/inScreenshotTests";
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

export default function World({
  onClick,
  autoTextBackgroundColor,
  children,
  onCameraStateChange,
  cameraState,
  cameraState: { perspective },
  isPlaying,
  markerProviders,
  onDoubleClick,
  onMouseDown,
  onMouseMove,
  onMouseUp,
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

  const useGLText = useExperimentalFeature("glText");
  const TextComponent = useGLText ? GLText : Text;

  return (
    <Worldview
      cameraState={cameraState}
      enableStackedObjectEvents={!isPlaying}
      hideDebug={inScreenshotTests()}
      onCameraStateChange={onCameraStateChange}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}>
      {children}
      <OccupancyGrids layerIndex={-1}>{grid}</OccupancyGrids>
      {additionalMarkers}
      <Lines>{[...lineList, ...lineStrip]}</Lines>
      <Arrows>{arrow}</Arrows>
      <Points>{points}</Points>
      <PointClouds>{pointcloud}</PointClouds>
      <Triangles>{triangleList}</Triangles>
      <Spheres>{[...sphere, ...sphereList]}</Spheres>
      <Cylinders>{cylinder}</Cylinders>
      <Cubes>{[...cube, ...cubeList]}</Cubes>
      <PoseMarkers>{poseMarker}</PoseMarkers>
      <LaserScans>{laserScan}</LaserScans>
      <TextComponent autoBackgroundColor={autoTextBackgroundColor}>
        {useGLText
          ? text.map((marker) => ({
              ...marker,
              scale: {
                // RViz ignores scale.x/y for text and only uses z
                x: marker.scale.z,
                y: marker.scale.z,
                z: marker.scale.z,
              },
            }))
          : text}
      </TextComponent>
      <FilledPolygons>{filledPolygon}</FilledPolygons>
      <Lines getChildrenForHitmap={getChildrenForHitmap}>{instancedLineList}</Lines>
      <LinedConvexHulls>{linedConvexHull}</LinedConvexHulls>
    </Worldview>
  );
}
