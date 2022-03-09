// @flow
//
//  Copyright (c) 2021-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import type { Interactive } from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/types";
import type { Marker } from "webviz-core/src/types/Messages";
import type { MarkerCollector } from "webviz-core/src/types/Scene";

export class OpenSourceMarkerCollector implements MarkerCollector {
  markers: Interactive<Marker>[] = [];
  grids: any[] = [];

  arrow = (o: any) => this.markers.push(o);
  cube = (o: any) => this.markers.push(o);
  cubeList = (o: any) => this.markers.push(o);
  sphere = (o: any) => this.markers.push(o);
  cylinder = (o: any) => this.markers.push(o);
  lineStrip = (o: any) => this.markers.push(o);
  lineList = (o: any) => this.markers.push(o);
  sphereList = (o: any) => this.markers.push(o);
  points = (o: any) => this.markers.push(o);
  text = (o: any) => this.markers.push(o);
  triangleList = (o: any) => this.markers.push(o);
  poseMarker = (o: any) => this.markers.push(o);
  filledPolygon = (o: any) => this.markers.push(o);
  instancedLineList = (o: any) => this.markers.push(o);
  overlayIcon = (o: any) => this.markers.push(o);
  grid(o: any) {
    this.grids.push(o);
  }
  pointcloud(o: any) {
    this.markers.push(o);
  }
  laserScan(_o: any) {
    throw new Error("not used in test");
  }
  radarPointCluster(_o: any) {
    throw new Error("not used in test");
  }
  linedConvexHull(_o: any) {
    throw new Error("not used in test");
  }
}
