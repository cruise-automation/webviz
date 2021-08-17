// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import _ from "lodash";
import { TimeUtil } from "rosbag";

import type { ConditionalFormat, ColumnFilter } from "webviz-core/src/panels/Table/types";
import { isNumberType } from "webviz-core/src/util/binaryObjects/messageDefinitionUtils";
import { rosTimeToUrlTime } from "webviz-core/src/util/time";

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

export const COMPARATOR_LIST = ["<", ">", "==", "!=", ">=", "<=", "~"];

const COMPARATOR_FUNCTIONS = {
  "<": (x, y) => x < y,
  ">": (x, y) => x > y,
  "==": (x, y) => x === y,
  "!=": (x, y) => x !== y,
  ">=": (x, y) => x >= y,
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
    // TODO(troy): Surface this error case to users.
    return null;
  }
};

export const filterColumn = (
  fieldType: string,
  columnId: string,
  rows: any,
  _columnIds: string[],
  columnFilter: ColumnFilter
) => {
  if (!columnFilter.value) {
    return rows;
  }

  const isNumberColumn = isNumberType(fieldType);
  const isBooleanColumn = fieldType === "bool";

  return rows.filter((row) => {
    const value = _.get(row.values, columnId);
    const formattedValue = fieldType === "time" || fieldType === "duration" ? rosTimeToUrlTime(value) : value;
    const filterValue = isNumberColumn
      ? Number(columnFilter.value)
      : isBooleanColumn
      ? columnFilter.value === "true"
      : columnFilter.value;
    return evaluateCondition(formattedValue, columnFilter.comparator, filterValue);
  });
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
