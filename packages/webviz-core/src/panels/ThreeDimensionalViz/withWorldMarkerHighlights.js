// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { partition } from "lodash";
import React, { type ComponentType } from "react";

import Cover from "webviz-core/src/panels/ThreeDimensionalViz/commands/Cover";
import {
  LAYER_INDEX_HIGHLIGHT_OVERLAY,
  LAYER_INDEX_HIGHLIGHT_BASE,
} from "webviz-core/src/panels/ThreeDimensionalViz/constants";
import { type WorldMarkerProps } from "webviz-core/src/panels/ThreeDimensionalViz/WorldMarkers";

const withHighlights = (BaseWorldMarkers: ComponentType<WorldMarkerProps>) => {
  const WorldMarkersWithHighlights = (props: WorldMarkerProps) => {
    const { markersByType } = props;

    // We only want to render the dim <Cover> overlay if there's at least one highlighted marker in the scene.
    let hasHighlightedMarkers = false;
    const highlightedMarkersByType = {};
    const nonHighlightedMarkersByType = {};

    // Partition the markersByType into two sets: highlighted and non-highlighted
    Object.keys(markersByType).forEach((type) => {
      const [highlightedMarkers, nonHighlightedMarkers] = partition(
        markersByType[type],
        ({ interactionData }) => interactionData?.highlighted
      );

      highlightedMarkersByType[type] = highlightedMarkers;
      nonHighlightedMarkersByType[type] = nonHighlightedMarkers;
      hasHighlightedMarkers = hasHighlightedMarkers || highlightedMarkers.length > 0;
    });

    return (
      <>
        <BaseWorldMarkers {...{ ...props, markersByType: nonHighlightedMarkersByType }} />
        <Cover
          color={[0, 0, 0, hasHighlightedMarkers ? 0.6 : 0]}
          layerIndex={LAYER_INDEX_HIGHLIGHT_OVERLAY}
          overwriteDepthBuffer
        />
        <BaseWorldMarkers
          {...{
            ...props,
            layerIndex: LAYER_INDEX_HIGHLIGHT_BASE,
            markersByType: highlightedMarkersByType,
          }}
        />
      </>
    );
  };
  WorldMarkersWithHighlights.displayName = "WorldMarkersWithHighlights";
  return WorldMarkersWithHighlights;
};

export default withHighlights;
