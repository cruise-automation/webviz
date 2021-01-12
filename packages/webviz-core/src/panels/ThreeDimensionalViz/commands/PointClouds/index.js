// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useRef, useState } from "react";
import {
  Command,
  withPose,
  type Regl,
  type CommonCommandProps,
  type AssignNextColorsFn,
  type MouseEventObject,
  vec4ToRGBA,
} from "regl-worldview";

import { FLOAT_SIZE } from "./buffers";
import { decodeMarker } from "./decodeMarker";
import { updateMarkerCache } from "./memoization";
import type { MemoizedMarker, MemoizedVertexBuffer, VertexBuffer } from "./types";
import VertexBufferCache from "./VertexBufferCache";
import filterMap from "webviz-core/src/filterMap";
import { toRgba } from "webviz-core/src/panels/ThreeDimensionalViz/commands/PointClouds/selection";
import {
  DEFAULT_FLAT_COLOR,
  DEFAULT_MIN_COLOR,
  DEFAULT_MAX_COLOR,
} from "webviz-core/src/panels/ThreeDimensionalViz/TopicSettingsEditor/PointCloudSettingsEditor";
import type { PointCloud } from "webviz-core/src/types/Messages";

const COLOR_MODE_FLAT = 0;
const COLOR_MODE_RGB = 1;
const COLOR_MODE_BGR = -1;
const COLOR_MODE_GRADIENT = 2;
const COLOR_MODE_RAINBOW = 3;

// Implements a custom caching mechanism for vertex buffers.
// Any memoized vertex buffer needs to be re-created whenever the Regl context
// changes. That happens mostly when resizing the canvas or adding/removing new
// panels on Webviz. Whenever Regl context changes, pointCloud() is called again
// and creates new instances for both position and color caches, leading to regenerating
// all buffers again.
// Memoized buffers are automatically deleted by WebGL whenever its context
// changes. There's no need to manually delete them.
const makePointCloudCommand = () => {
  // The same vertex buffer can be used for both positions and colors (see comments in color attribute below).
  // For that reason, we need to keep two independent caches.
  // We need to instantiate them outside of the actual command in order to provide independent
  // caches for each render pass. This prevents reseting caches when calling <PointClouds />
  // multiple times for the same frame, like when implementing highlighting.
  const positionBufferCache = new VertexBufferCache();
  const colorBufferCache = new VertexBufferCache();

  return (regl: Regl) => {
    const getCachedBuffer = (cache: VertexBufferCache, vertexBuffer: VertexBuffer): MemoizedVertexBuffer => {
      const { buffer, offset, stride } = vertexBuffer;
      let memoized = cache.get(vertexBuffer);
      if (
        !memoized ||
        memoized.vertexBuffer.buffer !== buffer ||
        memoized.offset !== FLOAT_SIZE * offset ||
        memoized.stride !== FLOAT_SIZE * stride
      ) {
        // If this is a new vertex buffer or if its content has changed somehow
        // (rendering to hitmap or different settings), create a new memoized
        // GPU buffer with the correct offset and stride and add it to the cache.
        memoized = {
          vertexBuffer,
          buffer: regl.buffer(buffer),
          offset: FLOAT_SIZE * offset,
          stride: FLOAT_SIZE * stride,
          divisor: 0,
        };
        cache.set(vertexBuffer, memoized);
      }
      return memoized;
    };

    const pointCloudCommand = withPose({
      primitive: "points",
      vert: `
      precision mediump float;

      // this comes from the camera
      uniform mat4 projection, view;

      #WITH_POSE

      attribute vec3 position;
      attribute vec3 color; // color values in range [0-255]

      uniform float pointSize;
      uniform int colorMode;
      uniform vec4 flatColor;
      uniform vec4 minGradientColor;
      uniform vec4 maxGradientColor;
      uniform float minColorFieldValue;
      uniform float maxColorFieldValue;

      varying vec3 fragColor;

      float getFieldValue() {
        return color.x;
      }

      float getFieldValue_UNORM() {
        float value = getFieldValue();
        float colorFieldRange = maxColorFieldValue - minColorFieldValue;
        if (abs(colorFieldRange) < 0.00001) {
          return 0.0;
        }
        return max(0.0, min((value - minColorFieldValue) / colorFieldRange, 1.0));
      }

      vec3 gradientColor() {
        float pct = getFieldValue_UNORM();
        return mix(minGradientColor, maxGradientColor, pct).rgb;
      }

      // taken from http://docs.ros.org/jade/api/rviz/html/c++/point__cloud__transformers_8cpp_source.html
      // line 47
      vec3 rainbowColor() {
        float pct = getFieldValue_UNORM();
        float h = (1.0 - pct) * 5.0 + 1.0;
        float i = floor(h);
        float f = fract(h);
        // if i is even
        if (mod(i, 2.0) < 1.0) {
          f = 1.0 - f;
        }
        float n = 1.0 - f;
        vec3 ret = vec3(0);
        if (i <= 1.0) {
          ret = vec3(n, 0.0, 1.0);
        } else if (i == 2.0) {
          ret = vec3(0.0, n, 1.0);
        } else if (i == 3.0) {
          ret = vec3(0.0, 1.0, n);
        } else if (i == 4.0) {
          ret = vec3(n, 1.0, 0.0);
        } else {
          ret = vec3(1.0, n, 0.0);
        }
        return 255.0 * ret;
      }

      void main () {
        gl_PointSize = pointSize;
        vec3 p = applyPose(position);
        gl_Position = projection * view * vec4(p, 1);

        if (colorMode == ${COLOR_MODE_GRADIENT}) {
          fragColor = gradientColor();
        } else if (colorMode == ${COLOR_MODE_RAINBOW}) {
          fragColor = rainbowColor();
        } else if (colorMode == ${COLOR_MODE_BGR}) {
          fragColor = vec3(color.b, color.g, color.r);
        } else if (colorMode == ${COLOR_MODE_RGB}) {
          fragColor = color;
        } else {
          fragColor = flatColor.rgb;
        }
      }
    `,
      frag: `
      precision mediump float;
      varying vec3 fragColor;
      uniform bool isCircle;
      void main () {
        if (isCircle) {
          // gl_PointCoord give us the coordinate of this pixel relative to the current point's position
          // In order to render a circle, we normalize and compute the distance from the current point.
          // Discard any fragments that are too far away from the center
          vec3 normal;
          normal.xy = gl_PointCoord * 2.0 - 1.0;
          float r2 = dot(normal.xy, normal.xy);
          if (r2 > 1.0) {
            discard;
          }
        }
        gl_FragColor = vec4(fragColor / 255.0, 1.0);
      }
    `,
      attributes: {
        position: (context, props) => {
          return getCachedBuffer(positionBufferCache, props.positionBuffer);
        },
        color: (context, props) => {
          const { hitmapColors, settings, blend } = props;
          const { colorMode } = settings;
          if (hitmapColors) {
            // If colors are provided, we use those instead what is indicated by colorMode
            // This is a common scenario when rendering to the hitmap, for example.
            // Unfortunately, we cannot memoize hitmap colors since new objects can be added
            // to the scene hierarchy at any time.
            return hitmapColors;
          }

          if (blend?.color) {
            // If a constant color is provided for blending, ignore point colors. Send positions
            // instead (see comments below).
            return getCachedBuffer(positionBufferCache, props.positionBuffer);
          }

          // If we're using "flat" color mode, we pass the actual color in a uniform (see uniforms below)
          // But we still need to provide some color buffer, even if it's not going to be used.
          // Instead of creating a dummy buffer, we just send the one we have for position.
          // TODO (Hernan): I tried using the constant option provided by Regl, but it leads to
          // visual artifacts. I need to check if this is a bug in Regl.
          const colorBuffer = !colorMode || colorMode.mode === "flat" ? props.positionBuffer : props.colorBuffer;
          return getCachedBuffer(colorBufferCache, colorBuffer);
        },
      },

      uniforms: {
        pointSize: (context, props) => {
          return props.settings?.pointSize || 2;
        },
        isCircle: (context, props) => {
          return props.settings?.pointShape ? props.settings?.pointShape === "circle" : true;
        },
        colorMode: (context, props) => {
          const { settings, is_bigendian, hitmapColors, blend } = props;
          if (hitmapColors) {
            // We're providing a colors array in RGB format
            return COLOR_MODE_RGB;
          }

          if (blend?.color) {
            // Force to `flat` mode if constant color is required for blending.
            return COLOR_MODE_FLAT;
          }

          const { colorMode } = settings;
          if (colorMode.mode === "flat") {
            return COLOR_MODE_FLAT;
          } else if (colorMode.mode === "gradient") {
            return COLOR_MODE_GRADIENT;
          } else if (colorMode.mode === "rainbow") {
            return COLOR_MODE_RAINBOW;
          }
          return is_bigendian ? COLOR_MODE_RGB : COLOR_MODE_BGR;
        },
        flatColor: (context, props) => {
          if (props.blend && props.blend.color) {
            // Use constant color for blending.
            return toRgba(vec4ToRGBA(props.blend.color));
          }
          return toRgba(props.settings.colorMode.flatColor || DEFAULT_FLAT_COLOR);
        },
        minGradientColor: (context, props) => {
          return toRgba(props.settings.colorMode.minColor || DEFAULT_MIN_COLOR);
        },
        maxGradientColor: (context, props) => {
          return toRgba(props.settings.colorMode.maxColor || DEFAULT_MAX_COLOR);
        },
        minColorFieldValue: (context, props) => {
          return props.minColorValue;
        },
        maxColorFieldValue: (context, props) => {
          return props.maxColorValue;
        },
      },

      count: (context, props) => {
        return props.pointCount;
      },
    });

    const command = regl(pointCloudCommand);

    return (props: any) => {
      // Call 'onPreRender' for both caches before rendering a frame.
      positionBufferCache.onPreRender();
      colorBufferCache.onPreRender();

      if (props.length > 0) {
        const { depth, blend } = props[0];
        if (depth || blend) {
          // If there are custom rendering states, we create a new command
          // with those values to render the markers. NOTE: This assumes that all
          // markers will be rendered with the same overrides, which might not
          // be the case in the future.
          regl({
            ...pointCloudCommand,
            depth,
            blend,
          })(props);
        } else {
          command(props);
        }
      }

      // Call 'onPostRender' for both caches after rendering a frame
      // This will delete any unused GPU buffer and prevent memory leaks.
      positionBufferCache.onPostRender();
      colorBufferCache.onPostRender();
    };
  };
};

function instancedGetChildrenForHitmap<
  T: {
    hitmapColors?: Uint8Array | number[],
    width?: number,
    height?: number,
    settings?: {
      pointSize?: number,
    },
  }
>(props: T[], assignNextColors: AssignNextColorsFn, excludedObjects: MouseEventObject[]): T[] {
  return filterMap(props, (prop) => {
    // exclude all points if one has been interacted with because iterating through all points
    // in pointcloud object is expensive
    const isInExcludedObjects = excludedObjects.find(({ object }) => object === prop);
    if (isInExcludedObjects) {
      return null;
    }
    const hitmapProp = { ...prop };
    const { width, height } = prop;
    if (!width || !height) {
      return null;
    }
    const instanceCount = Math.ceil(width * height);
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
    hitmapProp.hitmapColors = allColors;
    // expand the interaction area
    hitmapProp.settings = hitmapProp.settings ? { ...hitmapProp.settings } : {};
    hitmapProp.settings.pointSize = (hitmapProp.settings.pointSize || 2) * 5;
    return hitmapProp;
  });
}

type Props = { ...CommonCommandProps, children: PointCloud[], clearCachedMarkers?: boolean };

export default function PointClouds({ children, clearCachedMarkers, ...rest }: Props) {
  const [command] = useState(() => makePointCloudCommand());
  const markerCache = useRef(new Map<Uint8Array, MemoizedMarker>());
  markerCache.current = updateMarkerCache(markerCache.current, children);
  const decodedMarkers = !clearCachedMarkers
    ? [...markerCache.current.values()].map((decoded) => decoded.marker)
    : children.map((m) => decodeMarker(m));
  return (
    <Command getChildrenForHitmap={instancedGetChildrenForHitmap} {...rest} reglCommand={command}>
      {decodedMarkers}
    </Command>
  );
}
