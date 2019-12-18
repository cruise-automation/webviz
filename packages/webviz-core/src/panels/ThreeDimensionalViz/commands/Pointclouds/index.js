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
  withPose,
  type Regl,
  type CommonCommandProps,
  type AssignNextColorsFn,
  type MouseEventObject,
} from "regl-worldview";

import filterMap from "webviz-core/src/filterMap";
import { memoizedMapMarker } from "webviz-core/src/panels/ThreeDimensionalViz/commands/Pointclouds/PointCloudBuilder";
import { type PointCloud } from "webviz-core/src/types/Messages";

const pointCloud = (regl: Regl) => {
  const pointCloudCommand = withPose({
    primitive: "points",
    vert: `
      precision mediump float;

      // this comes from the camera
      uniform mat4 projection, view;

      #WITH_POSE

      attribute vec3 position;
      attribute vec3 color;
      uniform float pointSize;
      varying vec3 fragColor;
      void main () {
        gl_PointSize = pointSize;
        vec3 p = applyPose(position);
        gl_Position = projection * view * vec4(p, 1);
        fragColor = color;
      }
  `,
    frag: `
      precision mediump float;
      varying vec3 fragColor;
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
        gl_FragColor = vec4(fragColor.x / 255.0, fragColor.y / 255.0, fragColor.z / 255.0, 1);
      }
  `,
    attributes: {
      position: regl.prop("points"),
      color: regl.prop("colors"),
    },

    uniforms: {
      pointSize: (context, props) => {
        return props.settings?.pointSize || 2;
      },
      isCircle: (context, props) => {
        return props.settings?.pointShape ? props.settings?.pointShape === "circle" : true;
      },
    },

    count: (context, props) => {
      return props.points.length / 3;
    },
  });

  const command = regl(pointCloudCommand);

  return (props: any) => {
    command(props);
  };
};

function instancedGetChildrenForHitmap<
  T: {
    points: Float32Array,
    colors: Uint8Array | number[],
    settings: {
      pointSize?: number,
    },
  }
>(props: T[], assignNextColors: AssignNextColorsFn, excludedObjects: MouseEventObject[]): T[] {
  return filterMap(props, (prop) => {
    // exclude all points if one has been interacted with because iterating through all points in
    // in pointcloud object is expensive
    const isInExcludedObjects = excludedObjects.find(({ object }) => object === prop);
    if (isInExcludedObjects) {
      return null;
    }
    const hitmapProp = { ...prop };
    const instanceCount = Math.ceil(prop.points.length / 3);
    if (instanceCount < 1) {
      return null;
    }
    const idColors = assignNextColors(prop, instanceCount);
    const allColors = [];
    idColors.forEach((color) => {
      allColors.push(color[0] * 255);
      allColors.push(color[1] * 255);
      allColors.push(color[2] * 255);
    });
    hitmapProp.colors = allColors;
    // expand the interaction area
    hitmapProp.settings = hitmapProp.settings ? { ...hitmapProp.settings } : {};
    hitmapProp.settings.pointSize = (hitmapProp.settings.pointSize || 2) * 5;
    return hitmapProp;
  });
}

type Props = { ...CommonCommandProps, children: PointCloud[] };

export default function PointClouds({ children, ...rest }: Props) {
  const decodedMarkers = children.map(memoizedMapMarker);
  return (
    <Command getChildrenForHitmap={instancedGetChildrenForHitmap} {...rest} reglCommand={pointCloud}>
      {decodedMarkers}
    </Command>
  );
}
