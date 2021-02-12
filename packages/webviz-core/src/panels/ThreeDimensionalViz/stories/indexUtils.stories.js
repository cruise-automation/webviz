// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { type Color } from "regl-worldview";

import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import { MARKER_MSG_TYPES } from "webviz-core/src/util/globalConstants";

const GAP = 11;
const TOTAL = 11;
let ID = 1;
export const ROS_VIZ_TOPIC_NAME = "/viz_markers";

export const p = (x: number, y: number = x, z: number = x) => ({ x, y, z });
export const q = (x: number, y: number = x, z: number = x, w: number = x) => ({ x, y, z, w });

const buildMatrix = (x: number, y: number, z: number, step = 1) => {
  const result = [];
  for (let i = 0; i < x; i++) {
    for (let j = 0; j < y; j++) {
      for (let k = 0; k < z; k++) {
        result.push(p(i * step, j * step, k * step));
      }
    }
  }
  return result;
};

function numberToColor(number: number, max: number, a: number = 1): Color {
  const i = (number * 255) / max;
  const r = Math.round(Math.sin(0.024 * i + 0) * 127 + 128) / 255;
  const g = Math.round(Math.sin(0.024 * i + 2) * 127 + 128) / 255;
  const b = Math.round(Math.sin(0.024 * i + 4) * 127 + 128) / 255;
  return { r, g, b, a };
}

function getTriangles(count: number = 10) {
  const colors = [];
  const points = [];

  for (let i = 0; i < count; i++) {
    points.push({ x: 5 * i, y: 0, z: 0 });
    points.push({ x: 5 * i, y: 5, z: 0 });
    points.push({ x: 5 * i + 5, y: 5, z: 0 });
    colors.push(numberToColor(i * 3, count * 3));
    colors.push(numberToColor(i * 3 + 1, count * 3));
    colors.push(numberToColor(i * 3 + 2, count * 3));
  }
  return { colors, points };
}

export function getLinePoints(count: number = 10) {
  const points = [];
  for (let i = 0; i < count; i++) {
    if (i % 3 === 0) {
      points.push({ x: -5, y: 5 * i, z: 0 });
    } else if (i % 3 === 1) {
      points.push({ x: 1 * i, y: -15, z: 0 });
    }
    points.push({ x: i * 0.8, y: 0, z: 0 });
  }
  return points;
}
type Props = {
  type: number,
};

export function generateMarkers(props: Props, idx: number, markerName: string) {
  const rootTfID = getGlobalHooks().perPanelHooks().ThreeDimensionalViz.rootTransformFrame;
  const header = { seq: 257399, stamp: { sec: 1534827954, nsec: 262587964 }, frame_id: rootTfID };
  const pose = {
    position: { x: idx * GAP - (TOTAL * GAP) / 2 - 20, y: 0, z: 0 },
    orientation: { x: 0, y: 0, z: 0, w: 1 },
  };

  const color = numberToColor(idx, TOTAL);
  const id = ID++;
  const marker = {
    action: 0,
    header,
    id,
    ns: markerName,
    lifetime: { sec: 0, nsec: 200000000 },
    colors: [],
    points: [],
    pose,

    color,
    scale: { x: 1, y: 1, z: 1 },
    ...props,
  };

  const textMarker = {
    action: 0,
    header,
    id: ID++,
    ns: markerName,
    lifetime: { sec: 0, nsec: 200000000 },
    colors: [],
    points: [],
    pose,
    type: MARKER_MSG_TYPES.TEXT_VIEW_FACING,
    color: { r: 1, g: 1, b: 1, a: 1 },
    scale: { x: 1, y: 1, z: 1 },
    text: `${markerName}: ${props.type}`,
  };

  return [marker, textMarker];
}

export const markerProps = {
  ARROW: {
    type: MARKER_MSG_TYPES.ARROW,
    scale: { x: 2, y: 2, z: 2 },
  },
  CUBE: {
    type: MARKER_MSG_TYPES.CUBE,
    scale: { x: 5, y: 5, z: 5 },
  },
  SPHERE: {
    type: MARKER_MSG_TYPES.SPHERE,
    scale: { x: 5, y: 5, z: 5 },
  },
  CYLINDER: {
    type: MARKER_MSG_TYPES.CYLINDER,
    scale: { x: 5, y: 5, z: 5 },
  },
  LINE_STRIP: {
    type: MARKER_MSG_TYPES.LINE_STRIP,
    scale: { x: 0.1, y: 0.1, z: 0.1 },
    points: getLinePoints(10),
  },
  LINE_LIST: {
    type: MARKER_MSG_TYPES.LINE_LIST,
    scale: { x: 0.1, y: 0.1, z: 0.1 },
    points: getLinePoints(10),
  },
  CUBE_LIST: {
    type: MARKER_MSG_TYPES.CUBE_LIST,
    scale: { x: 1, y: 1, z: 1 },
    points: buildMatrix(3, 3, 3, 3),
  },
  SPHERE_LIST: {
    type: MARKER_MSG_TYPES.SPHERE_LIST,
    points: buildMatrix(3, 3, 3, 3),
  },
  POINTS: {
    type: MARKER_MSG_TYPES.POINTS,
    points: buildMatrix(5, 5, 5, 4),
  },
  TEXT_VIEW_FACING: {
    type: MARKER_MSG_TYPES.TEXT_VIEW_FACING,
    text: "Worldview",
    pose: {
      position: { x: 15, y: 0, z: 0 },
      orientation: { x: 0, y: 0, z: 0, w: 1 },
    },
  },
  TRIANGLE_LIST: {
    type: MARKER_MSG_TYPES.TRIANGLE_LIST,
    ...getTriangles(),
  },
};
