// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { first, last } from "lodash";
import React from "react";

import { isTypicalFilterName } from "webviz-core/src/components/MessagePathSyntax/isTypicalFilterName";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import { diffLabels } from "webviz-core/src/panels/RawMessages/getDiff";
import { format, formatDuration } from "webviz-core/src/util/formatTime";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

const DURATION_20_YEARS_SEC = 20 * 365 * 24 * 60 * 60;
export const DATA_ARRAY_PREVIEW_LIMIT = 20;
export const ROS_COMMON_MSGS: Set<string> = new Set([
  "actionlib_msgs",
  "diagnostic_msgs",
  "geometry_msgs",
  "nav_msgs",
  "sensor_msgs",
  "shape_msgs",
  "std_msgs",
  "stereo_msgs",
  "trajectory_msgs",
  "visualization_msgs",
]);

function getArrow(x: number, y: number) {
  if (x === 0 && y === 0) {
    return;
  }
  return <span style={{ transform: `rotate(${Math.atan2(-y, x)}rad)`, display: "inline-block" }}>→</span>;
}

export function getItemString(type: string, data: any, itemType: string, itemString: string) {
  const keys = Object.keys(data);
  if (keys.length === 2) {
    const { sec, nsec } = data;
    if (sec != null && nsec != null) {
      // Values "too small" to be absolute epoch-based times are probably relative durations.
      return sec < DURATION_20_YEARS_SEC ? formatDuration(data) : <span>{format(data)}</span>;
    }
  }

  // for vectors/points display length
  if (keys.length === 2) {
    const { x, y } = data;
    if (x != null && y != null) {
      const length = Math.sqrt(x * x + y * y);
      return (
        <span>
          norm = {length.toFixed(2)} {getArrow(x, y)}
        </span>
      );
    }
  }

  if (keys.length === 3) {
    const { x, y, z } = data;
    if (x != null && y != null && z != null) {
      const length = Math.sqrt(x * x + y * y + z * z);
      return (
        <span>
          norm = {length.toFixed(2)} {z === 0 ? getArrow(x, y) : undefined}
        </span>
      );
    }
  }

  // Surface typically-used keys directly in the object summary so the user doesn't have to expand it.
  const filterKeys = keys
    .filter(isTypicalFilterName)
    .map((key) => `${key}: ${data[key]}`)
    .join(", ");
  return (
    <span>
      {itemType} {filterKeys || itemString}
    </span>
  );
}

function getChangeCounts(data, startingCounts) {
  const possibleLabelTexts = Object.keys(startingCounts);
  for (const key in data) {
    if (possibleLabelTexts.includes(key)) {
      startingCounts[key]++;
    } else if (typeof data[key] === "object") {
      getChangeCounts(data[key], startingCounts);
    }
  }
  return startingCounts;
}

export const getItemStringForDiff = (type: string, data: any, itemType: string) => {
  const { ADDED, DELETED, CHANGED, ID } = diffLabels;
  const id = data[ID.labelText];
  const idLabel = id
    ? Object.keys(id)
        .map((key) => `${key}: ${id[key]}`)
        .join(", ")
    : null;
  const startingCounts = { [ADDED.labelText]: 0, [CHANGED.labelText]: 0, [DELETED.labelText]: 0 };
  const counts = getChangeCounts(data, startingCounts);
  return (
    <>
      {id ? (
        <span>
          {itemType} {idLabel}
        </span>
      ) : null}
      <span style={{ float: "right", color: CHANGED.color }}>
        {counts[ADDED.labelText] || counts[DELETED.labelText] ? (
          <span
            style={{
              display: "inline-block",
              fontSize: "0.8em",
              padding: 2,
              borderRadius: 3,
              backgroundColor: ADDED.color,
              marginRight: 5,
            }}>
            <span style={{ color: colors.GREEN }}>
              {counts[ADDED.labelText] ? `${diffLabels.ADDED.indicator}${counts[ADDED.labelText]} ` : null}
            </span>
            <span style={{ color: colors.RED }}>
              {counts[DELETED.labelText] ? `${diffLabels.DELETED.indicator}${counts[DELETED.labelText]}` : null}
            </span>
          </span>
        ) : null}
        {counts[CHANGED.labelText] ? (
          <span
            style={{
              display: "inline-block",
              width: 3,
              height: 3,
              borderRadius: 3,
              backgroundColor: CHANGED.color,
              marginRight: 5,
            }}>
            {counts[CHANGED.labelText] ? " " : null}
          </span>
        ) : null}
      </span>
    </>
  );
};

export function getMessageDocumentationLink(datatype: string): ?string {
  const parts = datatype.split("/");
  const pkg = first(parts);
  const filename = last(parts);
  return ROS_COMMON_MSGS.has(pkg)
    ? `http://docs.ros.org/api/${pkg}/html/msg/${filename}.html`
    : getGlobalHooks()
        .perPanelHooks()
        .RawMessages.docLinkFunction(filename);
}
