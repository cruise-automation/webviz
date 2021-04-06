// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import _ from "lodash";
import { TimeUtil } from "rosbag";

import type { ConditionalFormat } from "webviz-core/src/panels/Table/types";
import { formatFrame } from "webviz-core/src/util/time";

export const getLastAccessor = (accessorPath: string) => {
  const splitPath = accessorPath.split(".");
  // Filter any empty strings
  return splitPath.filter(Boolean).pop();
};

export const stripLastAccessor = (accessorPath: string) => {
  const splitPath = accessorPath.split(".").filter(Boolean);
  return splitPath.slice(0, splitPath.length - 1).join(".");
};

export const sortTimestamps = (rowA: any, rowB: any, columnId: string) => {
  const timeA = rowA?.values?.[columnId];
  const timeB = rowB?.values?.[columnId];
  if (!timeA || !timeB) {
    return 0;
  }

  return TimeUtil.compare(timeA, timeB);
};

export const filterTimestamps = (columnId: string, rows: any, columnIds: string[], filterValue: string) => {
  if (!filterValue) {
    return rows;
  }

  return rows.filter((row) => {
    const time = _.get(row.values, columnId);
    if (time && time?.sec && time?.nsec) {
      const stamp = formatFrame(time);
      return stamp.includes(filterValue);
    }
    return false;
  });
};

export const COMPARATOR_LIST = ["<", ">", "==", "!=", ">=", "<=", "~"];

const COMPARATOR_FUNCTIONS = {
  "<": (x, y) => x < y,
  ">": (x, y) => x > y,
  "==": (x, y) => x === y,
  "!=": (x, y) => x !== y,
  "=>": (x, y) => x >= y,
  "<=": (x, y) => x <= y,
  "~": (x, y) => {
    if (typeof y !== "string" || typeof x !== "string") {
      throw new Error("Cannot use a non-string to do substring matching.");
    }
    return new RegExp(y).test(x);
  },
};

// Exported for testing.
export const evaluateCondition = (value: any, comparator: string, primitive: string | number | boolean) => {
  try {
    return COMPARATOR_FUNCTIONS[comparator](value, primitive);
  } catch (e) {
    // TODO: Surface this error to users.
    console.error(e);
    return null;
  }
};

export const getFormattedColor = (value: any, conditionalFormats: ?(ConditionalFormat[])): string => {
  if (!conditionalFormats) {
    return "";
  }
  for (const conditionalFormat of conditionalFormats) {
    const { comparator, color, primitive } = conditionalFormat;
    if (evaluateCondition(value, comparator, primitive)) {
      return color;
    }
  }
  return "";
};
