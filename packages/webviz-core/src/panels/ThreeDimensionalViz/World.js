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
  type ReglClickInfo,
  type MouseHandler,
  type Vec4,
} from "regl-worldview";

import {
  OccupancyGrids,
  LaserScans,
  PointClouds,
  PoseMarkers,
} from "webviz-core/src/panels/ThreeDimensionalViz/commands";
import MarkerMetadata from "webviz-core/src/panels/ThreeDimensionalViz/MarkerMetadata";
import inScreenshotTests from "webviz-core/src/stories/inScreenshotTests";
import type { Scene, MarkerProvider } from "webviz-core/src/types/Scene";

type Props = {|
  autoTextBackgroundColor: boolean,
  cameraState: CameraState,
  children?: React.Node,
  cityName: ?string,
  debug: boolean,
  markerProviders: (?MarkerProvider)[],
  mouseClick: ({}) => void,
  onCameraStateChange: (CameraState) => void,
  onDoubleClick?: MouseHandler,
  onMouseDown?: MouseHandler,
  onMouseMove?: MouseHandler,
  onMouseUp?: MouseHandler,
  scene: Scene,
  version: ?string,
  extensions: string[],
|};

type PerceptionAreaConfig = {
  enabled: boolean,
  colors: Vec4[],
};

type ClickedObject = {
  id: number,
  markerName: string,
};

type State = {|
  zMin: number,
  perceptionAreaConfig: PerceptionAreaConfig,
  extensions: string[],
  clickedObject?: ClickedObject,
|};

function getMarkers(markerProviders: (?MarkerProvider)[], clickedObject?: ClickedObject) {
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
    cube: (o) => markers.cubes.push({ ...o, points: undefined }),
    cubeList: (o) => markers.cubes.push(o),
    sphere: (o) => markers.spheres.push({ ...o, points: undefined }),
    sphereList: (o) => markers.spheres.push(o),
    cylinder: (o) => markers.cylinders.push({ ...o, points: undefined }),
    lineStrip: (o) => markers.lines.push({ ...o, primitive: "line strip" }),
    lineList: (o) => markers.lines.push({ ...o, primitive: "lines" }),
    points: (o) => markers.points.push(o),
    text: (o) => markers.texts.push(o),
    triangleList: (o) => markers.triangles.push(o),
    poseMarker: (o) => markers.poseMarkers.push(o),

    grid: (o) => markers.grids.push(o),
    pointcloud: (o) => markers.pointclouds.push(o),
    laserScan: (o) => markers.laserScans.push(o),
    filledPolygon: (o) =>
      markers.filledPolygons.push({
        ...o,
        color: clickedObject && clickedObject.id === o.id ? { r: 1, g: 1, b: 1, a: 0.5 } : o.color,
      }),
  };

  markerProviders.forEach((provider) => {
    if (provider) {
      provider.renderMarkers(collector);
    }
  });

  return markers;
}

type MarkersProps = {
  autoTextBackgroundColor: boolean,
  markerProviders: (?MarkerProvider)[],
  clickedObject?: ClickedObject,
  onMarkerDoubleClick: (event: MouseEvent, clickInfo: ?ReglClickInfo, markerName: string) => void,
};

function Markers(props: MarkersProps) {
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
  } = getMarkers(props.markerProviders, props.clickedObject);
  return (
    <>
      <OccupancyGrids layerIndex={-1} key="OccupancyGrids">
        {grids}
      </OccupancyGrids>
      <Lines key="Lines">{lines}</Lines>,<Arrows key="Arrows">{arrows}</Arrows>,<Points key="Points">{points}</Points>
      <PointClouds key="PointClouds">{pointclouds}</PointClouds>,<Triangles key="TriangleLists">{triangles}</Triangles>
      <Spheres key="Spheres">{spheres}</Spheres>,<Cylinders key="Cylinders">{cylinders}</Cylinders>
      <Cubes key="Cubes">{cubes}</Cubes>
      <PoseMarkers key="PoseMarkers">{poseMarkers}</PoseMarkers>
      <LaserScans key="LaserScans">{laserScans}</LaserScans>
      <Text key="Text" autoBackgroundColor={props.autoTextBackgroundColor}>
        {texts}
      </Text>
      <FilledPolygons
        onDoubleClick={(event, clickInfo) => props.onMarkerDoubleClick(event, clickInfo, "filledPolygons")}
        key="FilledPolygons">
        {filledPolygons}
      </FilledPolygons>
    </>
  );
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
    clickedObject: undefined,
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

  onMarkerDoubleClick = (event: MouseEvent, clickInfo: ?ReglClickInfo, markerName: string) => {
    if (!clickInfo) {
      return;
    }
    const { objectId } = clickInfo;
    this.setState((state) => ({
      ...state,
      clickedObject: objectId ? { id: objectId, markerName } : undefined,
    }));
  };

  onDoubleClick = (event: MouseEvent, clickInfo: ?ReglClickInfo) => {
    if (!clickInfo) {
      return;
    }
    this.setState((state) => ({
      ...state,
      clickedObject: undefined,
    }));

    if (this.props.onDoubleClick) {
      this.props.onDoubleClick(event, clickInfo);
    }
  };

  onClick = (event: MouseEvent, clickInfo: ?ReglClickInfo) => {
    if (!clickInfo) {
      return;
    }
    const {
      ray: {
        point: [x, y],
      },
    } = clickInfo;

    // rather than choosing an arbitrary z-plane to intersect the ray with, just restrict point to
    // the top-down ortho view
    if (!this.props.cameraState.perspective && this.props.mouseClick) {
      const { markerProviders } = this.props;
      this.props.mouseClick({ markers: getMarkers(markerProviders), position: [x, y], event });
    }
  };

  renderClickedMetadata() {
    const { clickedObject } = this.state;
    if (!clickedObject) {
      return;
    }
    const { markerProviders } = this.props;
    const { id, markerName } = clickedObject;
    // We use currently rendered markers here for objects that have persistent
    // guids throughout a run, such as labels.
    const markers = getMarkers(markerProviders)[markerName];
    const clickedMarker = markers && markers.find((marker) => marker && marker.id === id);
    return clickedMarker && <MarkerMetadata marker={clickedMarker} />;
  }

  render() {
    const { clickedObject } = this.state;
    const {
      autoTextBackgroundColor,
      children,
      onCameraStateChange,
      onMouseDown,
      onMouseMove,
      onMouseUp,
      cameraState,
      markerProviders,
    } = this.props;

    return (
      <Worldview
        cameraState={cameraState}
        onCameraStateChange={onCameraStateChange}
        onClick={this.onClick}
        onDoubleClick={this.onDoubleClick}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        hitmapOnMouseMove={false}
        backgroundColor={[0, 0, 0, 0]}
        hideDebug={inScreenshotTests()}>
        {clickedObject && this.renderClickedMetadata()}
        <Markers
          autoTextBackgroundColor={autoTextBackgroundColor}
          markerProviders={markerProviders}
          clickedObject={clickedObject}
          onMarkerDoubleClick={this.onMarkerDoubleClick}
        />
        {children}
      </Worldview>
    );
  }
}
