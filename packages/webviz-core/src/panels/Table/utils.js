// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type {
  ConditionalFormat,
  ColumnConfigs,
  ConditionalFormats,
  MutableColumnConfigs,
} from "webviz-core/src/panels/Table/types";

export const getLastAccessor = (accessorPath: string) => {
  const splitPath = accessorPath.split(/(\.|\[\d+\])/);
  // Filter any empty strings
  return splitPath.filter(Boolean).pop();
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

export const getFormattedColor = (value: any, conditionalFormats: ?ConditionalFormats): string => {
  if (!conditionalFormats) {
    return "";
  }
  for (const id of Object.keys(conditionalFormats)) {
    const { comparator, color, primitive } = conditionalFormats[id];
    if (conditionalFormats[id] && evaluateCondition(value, comparator, primitive)) {
      return color;
    }
  }
  return "";
};

const findOldAccessorPath = (conditionalFormatId: string, columnConfigs: ?ColumnConfigs = {}): ?string => {
  for (const accessorPath in columnConfigs) {
    const conditionalFormats = columnConfigs[accessorPath] && columnConfigs[accessorPath]?.conditionalFormats;
    if (!conditionalFormats) {
      continue;
    }
    for (const id in conditionalFormats) {
      if (id === conditionalFormatId) {
        return accessorPath;
      }
    }
  }
};

export const updateConditionalFormat = (
  accessorPath: string,
  conditionalFormatId: string,
  newConditionalFormat: ?ConditionalFormat,
  columnConfigs: ?ColumnConfigs = {}
): ColumnConfigs => {
  const newColumnConfigs: MutableColumnConfigs = {
    ...columnConfigs,
  };

  // First delete the old entry.
  const oldAccessorPath = findOldAccessorPath(conditionalFormatId, columnConfigs);
  const currentConfig = newColumnConfigs[oldAccessorPath];
  const currentConditionalFormats = currentConfig?.conditionalFormats;
  if (currentConditionalFormats && currentConditionalFormats[conditionalFormatId]) {
    delete currentConditionalFormats[conditionalFormatId];
  }
  if (currentConditionalFormats && !Object.keys(currentConditionalFormats || {}).length) {
    delete newColumnConfigs[oldAccessorPath].conditionalFormats;
  }
  if (newColumnConfigs[oldAccessorPath] && !Object.keys(newColumnConfigs[oldAccessorPath]).length) {
    delete newColumnConfigs[oldAccessorPath];
  }

  // In this case we've already deleted the conditional format.
  if (!newConditionalFormat) {
    return (newColumnConfigs: any);
  }

  return {
    ...newColumnConfigs,
    [accessorPath]: {
      ...newColumnConfigs[accessorPath],
      conditionalFormats: {
        ...newColumnConfigs[accessorPath]?.conditionalFormats,
        [conditionalFormatId]: newConditionalFormat,
      },
    },
  };
};
