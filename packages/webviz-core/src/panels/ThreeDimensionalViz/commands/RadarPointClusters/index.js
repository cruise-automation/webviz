// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";
import {
  Command,
  nonInstancedGetChildrenForHitmap,
  withPose,
  type Regl,
  type CommonCommandProps,
  type Vec4,
} from "regl-worldview";

import type { RadarPointClusterSettings } from "webviz-core/src/panels/ThreeDimensionalViz/TopicSettingsEditor/RadarPointClusterSettingsEditor";
import type { Pose, RadarPointCluster } from "webviz-core/src/types/Messages";

const DEFAULT_POINT_SIZE = 4;

type ClusterWithSettingsAndPose = $ReadOnly<
  RadarPointCluster & {|
    pose: Pose,
    settings?: RadarPointClusterSettings,
  |}
>;

type ClusterWithSettingsAndPoseAndColors = $ReadOnly<ClusterWithSettingsAndPose & {| colors: Vec4 |}>;

function mapMarker(marker: ClusterWithSettingsAndPoseAndColors) {
  const { points, pose, settings = {} } = marker;
  const channel = settings.channel ?? "radial_vel";
  const minPoint = settings.minPoint ?? -10;
  const maxPoint = settings.maxPoint ?? 10;
  const pointShape = settings.pointShape ?? "circle";
  const pointSize = settings.pointSize ?? DEFAULT_POINT_SIZE;

  const ranges = new Float32Array(points.length);
  const azimuths = new Float32Array(points.length);
  const elevations = new Float32Array(points.length);
  const vals = new Array(points.length);

  for (let i = 0; i < points.length; i++) {
    ranges[i] = points[i].range;
    azimuths[i] = points[i].azimuth_angle_0;
    elevations[i] = points[i].elevation_angle;
    vals[i] = points[i][channel];
  }

  const colors =
    marker.colors.length > 0
      ? marker.colors
      : vals.map((val) => {
          if (val < minPoint) {
            return [1, 0, 0, 1];
          } else if (val > maxPoint) {
            return [1, 0, 1, 1];
          }
          const fraction = (val - minPoint) / (maxPoint - minPoint);
          if (fraction < 0.333) {
            return [1 - fraction, 1, 0, 1];
          } else if (fraction < 0.667) {
            return [0, 1, fraction - 0.333, 1];
          }
          return [0, 1.667 - fraction, 1, 1];
        });

  return {
    ranges,
    azimuths,
    elevations,
    colors,
    pose,
    pointSize,
    pointShape,
    channel,
    minPoint,
    maxPoint,
  };
}

const radarPointCluster = (regl: Regl) => {
  const radarPointClusterCommand = withPose({
    primitive: "points",
    vert: `
      precision mediump float;

      // this comes from the camera
      uniform mat4 projection, view;

      #WITH_POSE

      attribute float range;
      attribute float azimuth;
      attribute float elevation;
      attribute vec4 color;

      uniform float pointSize;
      uniform float minPoint;
      uniform float maxPoint;
      varying vec4 fragColor;

      void main () {
        gl_PointSize = pointSize;
        vec3 p = applyPose(vec3(range * cos(azimuth)*cos(elevation), range * sin(azimuth), range * sin(elevation)));
        gl_Position = projection * view * vec4(p, 1);
        fragColor = color;
      }
  `,
    frag: `
      precision mediump float;
      varying vec4 fragColor;
      uniform bool isCircle;
      void main () {
        if (isCircle) {
          vec3 normal;
          normal.xy = gl_PointCoord * 2.0 - 1.0;
          float r2 = dot(normal.xy, normal.xy);

          if (r2 > 1.0) {
            discard;
          }
        }

        gl_FragColor = fragColor;
      }
  `,
    attributes: {
      range: regl.prop("ranges"),
      azimuth: regl.prop("azimuths"),
      elevation: regl.prop("elevations"),
      color: regl.prop("colors"),
    },

    uniforms: {
      pointSize: (context, { pointSize }) => pointSize,
      isCircle: (context, { pointShape }) => pointShape === "circle",
      channel: (context, { channel }) => channel,
      minPoint: (context, { minPoint }) => minPoint,
      maxPoint: (context, { maxPoint }) => maxPoint,
    },

    count: (context, props) => {
      return props.ranges.length;
    },
  });

  const command = regl(radarPointClusterCommand);

  return (props: any) => {
    const arr = Array.isArray(props) ? props : [props];
    const mapped = arr.map(mapMarker);
    command(mapped);
  };
};

type Props = { ...CommonCommandProps, children: ClusterWithSettingsAndPose[] };

function getChildrenForHitmap(props, assignNextIds, excludedObjects) {
  // We need colors to be able to assign them correctly in the shader.
  const hitmapProps = nonInstancedGetChildrenForHitmap(props, assignNextIds, excludedObjects);
  // make the points easier to click.
  hitmapProps.forEach((prop) => {
    prop.pointSize = 5 * (prop.pointSize || DEFAULT_POINT_SIZE);
  });
  return hitmapProps;
}

export default function RadarPointClusters(props: Props) {
  // Hitmap code needs a `colors` member to work properly, and we can't add it inside the hitmap
  // code or the object identity breaks.
  const propsWithColors = React.useMemo(
    () => ({
      ...props,
      children: props.children.map((child) => ({ ...child, colors: [] })),
    }),
    [props]
  );
  return <Command getChildrenForHitmap={getChildrenForHitmap} {...propsWithColors} reglCommand={radarPointCluster} />;
}
