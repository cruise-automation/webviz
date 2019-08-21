// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { isEqual } from "lodash";
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
  type Vec4,
} from "regl-worldview";

import {
  OccupancyGrids,
  LaserScans,
  PointClouds,
  PoseMarkers,
} from "webviz-core/src/panels/ThreeDimensionalViz/commands";
import inScreenshotTests from "webviz-core/src/stories/inScreenshotTests";
import type { Scene, MarkerProvider } from "webviz-core/src/types/Scene";

type Props = {|
  autoTextBackgroundColor: boolean,
  cameraState: CameraState,
  children?: React.Node,
  debug: boolean,
  extensions: string[],
  markerProviders: (?MarkerProvider)[],
  onCameraStateChange: (CameraState) => void,
  onClick: MouseHandler,
  onDoubleClick: MouseHandler,
  onMouseDown?: MouseHandler,
  onMouseMove?: MouseHandler,
  onMouseUp?: MouseHandler,
  scene: Scene,
|};

type PerceptionAreaConfig = {
  enabled: boolean,
  colors: Vec4[],
};

type State = {|
  zMin: number,
  perceptionAreaConfig: PerceptionAreaConfig,
  extensions: string[],
|};

function getMarkers(markerProviders: (?MarkerProvider)[]) {
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
  };

  markerProviders.forEach((provider) => {
    if (provider) {
      provider.renderMarkers(collector);
    }
  });

  return markers;
}

const defaultPerceptionAreaConfig: PerceptionAreaConfig = {
  enabled: false,
  colors: [],
};

function getConfigFromExtensions(extensions: string[]): PerceptionAreaConfig {
  return defaultPerceptionAreaConfig;
}

export default class World extends React.Component<Props, State> {
  state = {
    zMin: 0,
    extensions: [],
    perceptionAreaConfig: {
      enabled: false,
      colors: [],
    },
  };

  static getDerivedStateFromProps(nextProps: Props, prevState: State) {
    const { extensions } = nextProps;
    const zMin = nextProps.scene.bounds.z.min - 1;

    // Check if the extension array is the same reference.
    // If it is not the same reference do a compare of each item (there are only a handful) and only
    // update state if the extensions actually change - the topic selector emits a new list of extensions
    // every time someone expands/collapses a node or types in the selection box...so if we don't check for
    // item equality here we end up re-rendering more than we need to.
    if (zMin >= prevState.zMin && isEqual(extensions, prevState.extensions)) {
      return null;
    }

    return {
      // save the extensions to compare next time we update
      extensions: nextProps.extensions,
      perceptionAreaConfig: getConfigFromExtensions(extensions),
      // set the zMin to 1 lower than the actual new zMin so it updates less frequently
      // otherwise the min going very slightly down every frame causes lots of renders
      zMin: zMin > prevState.zMin ? prevState.zMin : zMin - 1,
    };
  }

  render() {
    const {
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
    } = this.props;

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
    } = getMarkers(markerProviders);
    return (
      <Worldview
        cameraState={cameraState}
        onCameraStateChange={onCameraStateChange}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        hitmapOnMouseMove={false}
        backgroundColor={[0, 0, 0, 0]}
        hideDebug={inScreenshotTests()}>
        <OccupancyGrids layerIndex={-1} key="OccupancyGrids">
          {grids}
        </OccupancyGrids>
        <Lines key="Lines">{lines}</Lines>
        <Arrows key="Arrows">{arrows}</Arrows>
        <Points key="Points">{points}</Points>
        <PointClouds key="PointClouds">{pointclouds}</PointClouds>
        <Triangles key="TriangleLists">{triangles}</Triangles>
        <Spheres key="Spheres">{spheres}</Spheres>
        <Cylinders key="Cylinders">{cylinders}</Cylinders>
        <Cubes key="Cubes">{cubes}</Cubes>
        <PoseMarkers key="PoseMarkers">{poseMarkers}</PoseMarkers>
        <LaserScans key="LaserScans">{laserScans}</LaserScans>
        <Text key="Text" autoBackgroundColor={autoTextBackgroundColor}>
          {texts}
        </Text>
        <FilledPolygons key="FilledPolygons">{filledPolygons}</FilledPolygons>
        {children}
      </Worldview>
    );
  }
}
