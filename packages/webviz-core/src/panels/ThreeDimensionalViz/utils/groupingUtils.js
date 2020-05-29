// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { groupBy, toPairs } from "lodash";

import type { InstancedLineListMarker, LineListMarker, LineStripMarker } from "webviz-core/src/types/Messages";
import { COLORS, MARKER_MSG_TYPES } from "webviz-core/src/util/globalConstants";
import { emptyPose } from "webviz-core/src/util/Pose";

// Group multiple line strip and line list markers into as few as possible.
// This reduces the amount of draw calls required to render line them and increases performance.
// For improved performance, make sure inputs are either line strips or lists. Other
// marker types will be not be grouped together and will be returned as is.
export function groupLinesIntoInstancedLineLists(
  markers: (LineListMarker | LineStripMarker)[]
): InstancedLineListMarker[] {
  const resultMarkers = [];

  // Group instances by type, namespace and scale - scale because we can't set it on each instance, and namespace
  // because it's what's determines marker groupings that can be turned on/off in the topic selector.
  const groups = groupBy(
    markers,
    ({ scale, ns, type }) => `ns:${ns}_type:${type}_scalex:${scale.x}_scaley:${scale.y}_scalez:${scale.z}`
  );

  for (const [id: string, messageList: any[]] of toPairs(groups)) {
    const baseMessage = messageList[0];
    const allColors = []; // accumulated colors
    const allPoints = []; // accumulated positions
    const metadataByIndex = [];
    const poses = [];
    for (const message of messageList) {
      const { points, colors } = message;
      let lineListPoints = []; // marker positions
      let lineListColors = []; // marker colors
      if (baseMessage.type === MARKER_MSG_TYPES.LINE_STRIP) {
        // Line strips have points of the form [p1, p2, p3] and create lines between each point.
        // We want to turn these into line lists, of the form [p1, p2, p2, p3], so that each consecutive pair of
        // points creates a line.
        // We can't make an instanced line strip because then we'd have no way to tell where one instance stopped and
        // the next one started - we'd have lines leading from one instance to the next.
        lineListPoints = pair(points, !!message.closed);
        if (colors) {
          // Point colors, if present, need to be paired in the same way as positions
          lineListColors = pair(colors, !!message.closed);
        }
      } else {
        // If the marker is already a line list, just add the points to the list, validating that points
        // are paired correctly.
        lineListPoints = validateLineList(points);
        if (colors) {
          // Point colors, if present, need to be validated in the same way as positions
          lineListColors = validateLineList(colors);
        }
      }

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
        type: MARKER_MSG_TYPES.INSTANCED_LINE_LIST,
        primitive: "lines",
      }: InstancedLineListMarker)
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

// Takes an array, and returns a new array with each group of two paired.
// shouldClose: should pair the last and first indices.
// arr: [1], shouldClose: false => []
// arr: [1, 2, 3], shouldClose: false => [1, 2, 2, 3]
// arr: [1, 2, 3], shouldClose: true  => [1, 2, 2, 3, 3, 1]
function pair<T>(arr: T[], shouldClose: ?boolean): T[] {
  if (arr.length < 2) {
    return [];
  }
  const result = [];
  // If we are closing this pair, we add one last pair: [lastIndex, firstIndex]
  const numberOfPairs = shouldClose ? arr.length : arr.length - 1;
  for (let index = 0; index < numberOfPairs; index++) {
    result.push(arr[index], arr[(index + 1) % arr.length]);
  }
  return result;
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
