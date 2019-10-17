// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";
import {
  Worldview,
  Arrows,
  Cubes,
  Cylinders,
  Lines,
  Points,
  Spheres,
  Text,
  Triangles,
  FilledPolygons,
  type CameraState,
  type MouseHandler,
} from "regl-worldview";

import {
  OccupancyGrids,
  LaserScans,
  PointClouds,
  PoseMarkers,
  LinedConvexHulls,
} from "webviz-core/src/panels/ThreeDimensionalViz/commands";
import inScreenshotTests from "webviz-core/src/stories/inScreenshotTests";
import type { Scene, MarkerProvider } from "webviz-core/src/types/Scene";

type Props = {|
  autoTextBackgroundColor: boolean,
  cameraState: CameraState,
  children?: React.Node,
  convexHullOpacity: ?number,
  debug: boolean,
  extensions: string[],
  markerProviders: MarkerProvider[],
  onCameraStateChange: (CameraState) => void,
  onClick: MouseHandler,
  onDoubleClick: MouseHandler,
  onMouseDown?: MouseHandler,
  onMouseMove?: MouseHandler,
  onMouseUp?: MouseHandler,
  scene: Scene,
|};

function getMarkers(markerProviders: MarkerProvider[]) {
  const markers = {
    lines: [],
    grids: [],
    arrows: [],
    texts: [],
    cubes: [],
    spheres: [],
    points: [],
    pointclouds: [],
    poseMarkers: [],
    triangles: [],
    laserScans: [],
    cylinders: [],
    filledPolygons: [],
    instancedLineLists: [],
    linedConvexHulls: [],
  };

  const collector = {
    arrow: (o) => markers.arrows.push(o),
    cube: (o) => markers.cubes.push(o),
    cubeList: (o) => markers.cubes.push(o),
    sphere: (o) => markers.spheres.push(o),
    sphereList: (o) => markers.spheres.push(o),
    cylinder: (o) => markers.cylinders.push(o),
    lineStrip: (o) => markers.lines.push(o),
    lineList: (o) => markers.lines.push(o),
    points: (o) => markers.points.push(o),
    text: (o) => markers.texts.push(o),
    triangleList: (o) => markers.triangles.push(o),
    poseMarker: (o) => markers.poseMarkers.push(o),
    grid: (o) => markers.grids.push(o),
    pointcloud: (o) => markers.pointclouds.push(o),
    laserScan: (o) => markers.laserScans.push(o),
    filledPolygon: (o) => markers.filledPolygons.push(o),
    instancedLineList: (o) => markers.instancedLineLists.push(o),
    linedConvexHull: (o) => markers.linedConvexHulls.push(o),
  };

  markerProviders.forEach((provider) => {
    if (provider) {
      provider.renderMarkers(collector);
    }
  });

  return markers;
}

export default function World({
  markerProviders,
  autoTextBackgroundColor,
  children,
  onCameraStateChange,
  onClick,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  cameraState,
  onDoubleClick,
  convexHullOpacity,
}: Props) {
  const {
    lines,
    arrows,
    texts,
    cubes,
    spheres,
    points,
    triangles,
    poseMarkers,
    cylinders,
    grids,
    pointclouds,
    laserScans,
    filledPolygons,
    linedConvexHulls,
  } = getMarkers(markerProviders);

  return (
    <Worldview
      cameraState={cameraState}
      hideDebug={inScreenshotTests()}
      onCameraStateChange={onCameraStateChange}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      backgroundColor={[0, 0, 0, 0]}>
      <OccupancyGrids layerIndex={-1}>{grids}</OccupancyGrids>
      <Lines>{lines}</Lines>
      <Arrows>{arrows}</Arrows>
      <Points>{points}</Points>
      <PointClouds>{pointclouds}</PointClouds>
      <Triangles>{triangles}</Triangles>
      <Spheres>{spheres}</Spheres>
      <Cylinders>{cylinders}</Cylinders>
      <Cubes>{cubes}</Cubes>
      <PoseMarkers>{poseMarkers}</PoseMarkers>
      <LaserScans>{laserScans}</LaserScans>
      <Text autoBackgroundColor={autoTextBackgroundColor}>{texts}</Text>
      <FilledPolygons>{filledPolygons}</FilledPolygons>
      {/* By default, make the convex hull fill completely transparent - they just provide a click layer. */}
      <LinedConvexHulls opacity={convexHullOpacity || 0}>{linedConvexHulls}</LinedConvexHulls>
      {children}
    </Worldview>
  );
}
