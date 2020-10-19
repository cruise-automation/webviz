// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { partition } from "lodash";
import React, { type ComponentType } from "react";
import { vec4ToRGBA } from "regl-worldview";

import { LAYER_INDEX_DIFF_MODE_BASE_PER_PASS } from "webviz-core/src/panels/ThreeDimensionalViz/constants";
import type {
  InteractiveMarkersByType,
  WorldMarkerProps,
} from "webviz-core/src/panels/ThreeDimensionalViz/WorldMarkers";
import { SECOND_SOURCE_PREFIX } from "webviz-core/src/util/globalConstants";

export const BASE_COLOR = [0.5, 0.5, 0.5, 1.0];
export const SOURCE_1_COLOR = [1, 0, 1, 1];
export const SOURCE_2_COLOR = [0, 1, 1, 1];

export const BASE_COLOR_RGBA = vec4ToRGBA(BASE_COLOR);
export const SOURCE_1_COLOR_RGBA = vec4ToRGBA(SOURCE_1_COLOR);
export const SOURCE_2_COLOR_RGBA = vec4ToRGBA(SOURCE_2_COLOR);

// Group markers into different collections in order to render them with different colors
// based on their source.
export function getDiffBySource(markers: InteractiveMarkersByType): InteractiveMarkersByType[] {
  const ret = [{}, {}, {}];

  // Look for each marker type, spliting them into two sets if possible (one for each source)
  // Then, modify the markers so they're rendered based on their source.
  for (const key of Object.keys(markers)) {
    const value = markers[key];
    const elems = Array.isArray(value) ? value : [value];
    const [source1, source2] = partition(elems, (m) => {
      const { interactionData } = m;
      return !interactionData || !interactionData.topic.startsWith(SECOND_SOURCE_PREFIX);
    });

    // Format markers. This results in three render passes:
    // 1. Render Source 1 markers in red
    // 2. Render Source 2 markers in gray, disabling depth checking.
    // 3. Render Source 2 markers in green, with depth checking enabled (written in step 1).
    ret[0][key] = source1.map((m) => ({
      ...m,
      colors: [],
      color: SOURCE_1_COLOR_RGBA,
      depth: {
        enable: true,
        mask: true,
      },
      blend: {
        enable: true,
        func: {
          src: "constant color",
          dst: "src alpha",
        },
        color: SOURCE_1_COLOR,
      },
    }));
    ret[1][key] = source2.map((m) => ({
      ...m,
      colors: [],
      color: BASE_COLOR_RGBA,
      depth: {
        enable: false,
      },
      blend: {
        enable: true,
        func: {
          src: "constant color",
          dst: "zero",
        },
        color: BASE_COLOR,
      },
    }));
    ret[2][key] = source2.map((m) => ({
      ...m,
      colors: [],
      color: SOURCE_2_COLOR_RGBA,
      depth: {
        enable: true,
      },
      blend: {
        enable: true,
        func: {
          src: "constant color",
          dst: "one",
        },
        color: SOURCE_2_COLOR,
      },
    }));
  }
  return ret;
}

export const withDiffMode = (BaseWorldMarkers: ComponentType<WorldMarkerProps>) => {
  const WorldMarkersWithDiffMode = (props: WorldMarkerProps) => {
    const { diffModeEnabled } = props;
    if (diffModeEnabled) {
      return (
        <>
          {getDiffBySource(props.markersByType).map((markersByRenderPass, i) => (
            <BaseWorldMarkers
              key={i}
              {...{
                ...props,
                clearCachedMarkers: true,
                layerIndex: props.layerIndex + i * LAYER_INDEX_DIFF_MODE_BASE_PER_PASS,
                markersByType: markersByRenderPass,
              }}
            />
          ))}
        </>
      );
    }
    return <BaseWorldMarkers {...props} />;
  };
  return WorldMarkersWithDiffMode;
};
