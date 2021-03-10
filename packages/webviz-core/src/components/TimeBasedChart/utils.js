// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { uniqBy, sortedUniqBy, max, min, isEqual, throttle } from "lodash";
import { useEffect, useCallback, useState } from "react";
import type { Time } from "rosbag";
import uuid from "uuid";

import type { MessageHistoryItem } from "webviz-core/src/components/MessageHistoryDEPRECATED";
import type { MessagePathDataItem } from "webviz-core/src/components/MessagePathSyntax/useCachedGetMessagePathDataItems";
import { type ScaleBounds } from "webviz-core/src/components/ReactChartjs/zoomAndPanHelpers";
import { objectValues } from "webviz-core/src/util";
import { isBobject } from "webviz-core/src/util/binaryObjects";
import { useDeepChangeDetector, useForceUpdate } from "webviz-core/src/util/hooks";
import { defaultGetHeaderStamp } from "webviz-core/src/util/synchronizeMessages";
import { maybeGetBobjectHeaderStamp } from "webviz-core/src/util/time";

export type Bounds = {| minX: ?number, maxX: ?number |};

const boundsById: { [string]: Bounds } = {};
const forceUpdateById: { [string]: () => any } = {};
let output: Bounds = { minX: undefined, maxX: undefined };
let hasRenderedIds = new Set();
const THROTTLE_TIME_MS = 500;
const throttledForceUpdate = throttle(
  (id?: string) => {
    // Throttle updates because it's not imporant that components update immediately and calling `forceUpdate` often
    // lead to suboptimal performance. Most of the time, synced plots will update within THROTTLE_TIME_MS anyways,
    // making a forceUpdate unncessary.
    Object.keys(forceUpdateById).forEach((forceUpdateId) => {
      if (id !== forceUpdateId && !hasRenderedIds.has(forceUpdateId)) {
        forceUpdateById[forceUpdateId]();
      }
    });
  },
  THROTTLE_TIME_MS,
  { leading: false, trailing: true }
);
// If a chart updates when it is syncing its bounds, this will update all charts' bounds.
export const useSyncedTimeAxis = (bounds: Bounds, isSynced: boolean): Bounds => {
  const [id] = useState(uuid.v4());
  const forceUpdate = useForceUpdate();
  if (isSynced) {
    boundsById[id] = bounds;
    forceUpdateById[id] = forceUpdate;
    hasRenderedIds.add(id);
  }

  const recompute = useCallback(() => {
    const allBounds = objectValues(boundsById);
    const calculatedBounds = {
      minX: min(allBounds.map(({ minX }) => (minX == null ? undefined : minX))),
      maxX: max(allBounds.map(({ maxX }) => (maxX == null ? undefined : maxX))),
    };
    if (!isEqual(output, calculatedBounds)) {
      output = calculatedBounds;
      hasRenderedIds = new Set();
      throttledForceUpdate(id);
    }
  }, [id]);

  // Recompute and potentially update all subscribed components if the bounds update.
  const hasUpdated = useDeepChangeDetector([bounds], true);
  if (hasUpdated && isSynced) {
    recompute();
  }

  // When this component unmounts, no longer update it.
  useEffect(() => {
    return () => {
      if (isSynced) {
        delete boundsById[id];
        delete forceUpdateById[id];
        recompute();
      }
    };
  }, [id, isSynced, recompute]);

  return output;
};

export type TooltipItem = {|
  queriedData: MessagePathDataItem[],
  receiveTime: Time,
  headerStamp: ?Time,
|};

export type TimeBasedChartTooltipData = {|
  x: number,
  y: number | string,
  datasetKey?: string,
  item: TooltipItem,
  path: string,
  value: number | boolean | string,
  constantName?: ?string,
  startTime: Time,
  source?: ?number,
|};

export type DataPoint = {|
  x: number,
  y: number | string,
  label?: string,
  labelColor?: string,
|};

type Point = $ReadOnly<{ x: number, y: number | string }>;
export type DataSet = $ReadOnly<{
  data: $ReadOnlyArray<Point>,
  label: string,
  borderDash?: $ReadOnlyArray<number>,
  color?: string,
  showLine?: boolean,
}>;

export const getTooltipItemForMessageHistoryItem = (item: MessageHistoryItem): TooltipItem => {
  const { message } = item.message;
  const headerStamp = isBobject(message) ? maybeGetBobjectHeaderStamp(message) : defaultGetHeaderStamp(message);
  return { queriedData: item.queriedData, receiveTime: item.message.receiveTime, headerStamp };
};

const STEP_SIZES = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60];
export const stepSize = ({ min: minValue, max: maxValue, minAlongAxis, maxAlongAxis }: ScaleBounds) => {
  // Pick the smallest step size that gives lines greater than 50px apart
  const secondsPer50Pixels = 50 * ((maxValue - minValue) / (maxAlongAxis - minAlongAxis));
  return STEP_SIZES.find((step) => step > secondsPer50Pixels) || 60;
};

export const scalePerPixel = (bounds: ?ScaleBounds): ?number =>
  bounds && Math.abs(bounds.max - bounds.min) / Math.abs(bounds.maxAlongAxis - bounds.minAlongAxis);
const screenCoord = (value, valuePerPixel) => (valuePerPixel == null ? value : Math.trunc(value / valuePerPixel));
const datumStringPixel = ({ x, y }: Point, xScale: ?number, yScale: ?number): string =>
  `${screenCoord(x, xScale)},${typeof y === "string" ? y : screenCoord(y, yScale)}`;

// Exported for tests
export const filterDatasets = (
  datasets: $ReadOnlyArray<DataSet>,
  linesToHide: { [string]: boolean },
  xScalePerPixel: ?number,
  yScalePerPixel: ?number
): DataSet[] =>
  datasets
    // Only draw enabled lines. Needed for correctness.
    .filter(({ label }) => !linesToHide[label])
    // Remove redundant points to make drawing the chart more efficient.
    .map((dataset) => {
      const data = dataset.showLine
        ? // For line charts, just remove adjacent points on top of each other so we can draw self-
          // intersecting (loopy) lines.
          sortedUniqBy(dataset.data.slice(), (datum) => datumStringPixel(datum, xScalePerPixel, yScalePerPixel))
        : // For scatter charts there's no point in drawing any overlapping points.
          uniqBy(dataset.data.slice(), (datum) => datumStringPixel(datum, xScalePerPixel, yScalePerPixel));
      return { ...dataset, data };
    });

export const useForceRerenderOnVisibilityChange = () => {
  const forceUpdate = useForceUpdate();

  const onVisibilityChange = useCallback(() => {
    if (document.visibilityState === "visible") {
      // HACK: There is a Chrome bug that causes 2d canvas elements to get cleared when the page
      // becomes hidden on certain hardware:
      // https://bugs.chromium.org/p/chromium/issues/detail?id=588434
      // https://bugs.chromium.org/p/chromium/issues/detail?id=591374
      // We can hack around this by forcing a re-render when the page becomes visible again.
      // There may be other canvases that this affects, but these seemed like the most important.
      // Ideally we can find a global workaround but we're not sure there is one — can't just
      // twiddle the width/height attribute of the canvas as suggested in one of the comments on
      // a chrome bug; it seems like you really have to redraw the frame from scratch.
      forceUpdate();
    }
  }, [forceUpdate]);
  useEffect(() => {
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [onVisibilityChange]);
};
