// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { groupBy, toPairs } from "lodash";

import type { LineListMarker, LineStripMarker, InstancedLineListMarker } from "webviz-core/src/types/Messages";
import { COLORS, MARKER_MSG_TYPES } from "webviz-core/src/util/globalConstants";
import { emptyPose } from "webviz-core/src/util/Pose";

// Group multiple line strip and line list markers into as few as possible.
// This reduces the amount of draw calls required to render line them and increases performance.
// For improved performance, make sure inputs are either line strips or lists. Other
// marker types will be not be grouped together and will be returned as is.
export function groupLinesIntoInstancedLineLists(
  markers: (LineListMarker | LineStripMarker)[]
): (InstancedLineListMarker | LineStripMarker)[] {
  const resultMarkers = [];

  // Group instances by type, namespace and scale - scale because we can't set it on each instance, and namespace
  // because it's what's determines marker groupings that can be turned on/off in the topic selector.
  const groups = groupBy(
    markers,
    ({ scale, ns, type }) => `ns:${ns}_type:${type}_scalex:${scale.x}_scaley:${scale.y}_scalez:${scale.z}`
  );

  const INFINITE_POSITION = { x: NaN, y: NaN, z: NaN };
  const INFINITE_COLOR = COLORS.CLEAR;
  const INFINITE_POSE = emptyPose();
  const INFINITE_METADATA = {};

  for (const [id: string, messageList: any[]] of toPairs(groups)) {
    const baseMessage = messageList[0];
    const isLineStrip = baseMessage.type === MARKER_MSG_TYPES.LINE_STRIP;
    const allColors = []; // accumulated colors
    const allPoints = []; // accumulated positions
    const metadataByIndex = [];
    const poses = [];
    for (let messageIdx = 0; messageIdx < messageList.length; messageIdx++) {
      const message = messageList[messageIdx];
      const { points = [], colors = [] } = message;
      if (points.length === 0) {
        // Ignore markers with no points
        continue;
      }

      if (isLineStrip) {
        // We want to keep corners joined between lines in the same strip. The <Lines>
        // commands will handle corners automatically for line strips, but doesn't know how to rendered individual
        // strips since all of them are grouped together. For that reason, we add some extra points
        // to create invisible lines from/to infinity in between each of the strips. This ends
        // up rendering only the strips as if they were individual commands.
        // Since we also need to support selection, we need to add poses and metadata for each of those
        // new points or else the <Lines> command won't work correctly.
        // In practice, this process results in redundant data in each of the grouped markers, but
        // the performance cost is low.

        if (messageIdx > 0) {
          // If this is not the first strip, we need to add a line from infinity to the
          // first point that we want to render. By repeating the first point in the strip,
          // we also make sure gradients look correctly in the final rendered image.
          allPoints.push(points[0]);
          allColors.push(INFINITE_COLOR);
          poses.push(INFINITE_POSE);
          metadataByIndex.push(INFINITE_METADATA);
        }

        // Accumulate positions and colors
        extend(allPoints, points);
        extend(allColors, colors);

        // In case no point colors are provided or there are not enough values, we use the provided
        // color for the marker (or a default value)
        fillExtend(allColors, message.color || COLORS.WHITE, points.length - colors.length);

        // Accumulate poses for each points, if they're provided in the marker
        if (message.poses && message.poses.length > 0) {
          extend(poses, message.poses);
        }

        // Accumulate metadata and poses
        fillExtend(metadataByIndex, message, points.length);
        fillExtend(poses, message.pose, points.length - (message.poses ? message.poses.length : 0));

        if (baseMessage.closed) {
          // If this is a closed marker, we need to add an extra point to generate a new line
          // from the last element to the first one. We also need to add the metadata and a pose
          // that correspond to that point.
          allPoints.push(points[0]);
          allColors.push(colors.length > 0 ? colors[0] : message.color || COLORS.WHITE);
          metadataByIndex.push(message);
          poses.push(message.poses ? message.poses[0] : message.pose);
        }

        if (messageIdx < messageList.length - 1) {
          // If there are more strips in the same group, we add a line to infinity
          // The next strip will deal with connecting it with its first point (see above).
          // By repeating the last point in the strip we ensure gradients look
          // correctly in the final rendered image.
          allPoints.push(...[allPoints[allPoints.length - 1], INFINITE_POSITION]);
          allColors.push(...[INFINITE_COLOR, INFINITE_COLOR]);
          poses.push(...[INFINITE_POSE, INFINITE_POSE]);
          metadataByIndex.push(...[INFINITE_METADATA, INFINITE_METADATA]);
        }
      } else {
        // If the marker is already a line list, just add the points to the list, validating that points
        // are paired correctly.
        const lineListPoints = validateLineList(points);

        // Point colors, if present, need to be validated in the same way as positions
        const lineListColors = colors ? validateLineList(colors) : [];

        // Accumulate positions and colors
        extend(allPoints, lineListPoints);
        extend(allColors, lineListColors);

        // In case no point colors are provided or there are not enough values, we use the provided
        // color for the marker (or a default value)
        fillExtend(allColors, message.color || COLORS.WHITE, lineListPoints.length - lineListColors.length);

        // We have two points per instance.
        // Save the whole marker as the instanced object so we can display it
        // to the user after selection.
        fillExtend(metadataByIndex, message, lineListPoints.length / 2);
        fillExtend(poses, message.pose, lineListPoints.length / 2);
      }
    }

    if (isLineStrip) {
      // After all strips have been processed, we need to remove the last metadata and pose
      // That is because there are N - 1 lines in a strip consisting of N points (and it's easier
      // to do it here than inside the loop above).
      metadataByIndex.pop();
      poses.pop();
    }

    // Extract common properties from base marker
    const { header, action, ns, scale } = baseMessage;
    resultMarkers.push(
      ({
        header,
        action,
        ns,
        scale,
        pose: emptyPose(),
        colors: allColors,
        points: allPoints,
        poses,
        metadataByIndex,
        id,
        // $FlowFixMe - doesn't understand how to handle the type field in markers
        type: isLineStrip ? MARKER_MSG_TYPES.LINE_STRIP : MARKER_MSG_TYPES.INSTANCED_LINE_LIST,
        primitive: isLineStrip ? "line strip" : "lines",
      }: LineStripMarker | InstancedLineListMarker)
    );
  }

  return resultMarkers;
}

function extend<T>(arr1: T[], arr2: T[]) {
  arr2.forEach((v) => arr1.push(v));
}

// fillExtend and extend are a bit faster than alternatives that use filling or spreading to
// achieve the same purpose, and groupPredictionMarkersIntoInstancedMarkers is a fairly heavy
// function.
function fillExtend<T>(arr: T[], value: T, n: number): void {
  for (let i = 0; i < n; ++i) {
    arr.push(value);
  }
}

// For line lists, we need to check if the input array contains an
// even number of elements. Otherwise, drop the last one since it
// does not represent a valid line.
function validateLineList<T>(points: T[]): T[] {
  if (points.length % 2 !== 0) {
    points.pop();
  }
  return points;
}
