// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { get, omit, set, identity } from "lodash";

import type { ConditionalFormat, ColumnFilter, ColumnOptions, ColumnConfigs } from "webviz-core/src/panels/Table/types";
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
    const value = get(row.values, columnId);
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

export const flattenColumnOptions = (columnOptions: Array<ColumnOptions>) => {
  const flattenedColumnOptions = [...columnOptions];
  for (const columnOption of columnOptions) {
    if (columnOption.columns) {
      flattenedColumnOptions.push(...flattenColumnOptions(columnOption.columns));
    }
  }
  return flattenedColumnOptions;
};

type SortConfig = { getter: (val: any) => any, sortDesc: boolean, sortFn: (a: any, b: any) => number };

export const sortTableDataByColumnId = (
  data: $ReadOnlyArray<any>,
  sortConfig: $ReadOnlyArray<SortConfig>
): $ReadOnlyArray<any> => {
  const sortedData = [...data].sort((a, b) => {
    for (const { getter, sortDesc, sortFn } of sortConfig) {
      const valA = getter(a);
      const valB = getter(b);
      const sortInt = sortFn(valA, valB);
      if (sortInt !== 0) {
        return sortDesc ? -sortInt : sortInt;
      }
    }
    return 0;
  });
  return sortedData;
};

const defaultSortFn = (valA, valB) => {
  return valA === valB ? 0 : valA > valB ? 1 : -1;
};

const getGetter = (columnOptions: ColumnOptions) => {
  const { id = "", typeInfo } = columnOptions;
  if (typeInfo.isPrimitiveinComplexArrayColumn) {
    const accessors = id.split(".");
    const sortKey = accessors.pop();
    return (val) => get(val, [sortKey]);
  } else if (typeInfo.isPrimitiveArrayColumn) {
    return identity;
  }
  return (val) => get(val, id.split("."));
};

const getSortConfigs = (
  sortDescByColId: { [columnId: string]: boolean },
  sortedColIds: { id: string, time: number }[],
  columnOptions: ColumnOptions[]
) => {
  return sortedColIds
    .map(({ id }) => {
      const columnOption = columnOptions.find(({ id: _id }) => _id === id);
      if (!columnOption) {
        return null;
      }

      return {
        sortDesc: !!sortDescByColId[id],
        sortFn: columnOption.sortType || defaultSortFn,
        getter: getGetter(columnOption),
      };
    })
    .filter(Boolean);
};

export const sortTableData = (
  sortDescByColId: { [columnId: string]: boolean },
  sortDescTimeByColId: { [columnId: string]: number },
  columnOptions: ColumnOptions[],
  data: any
) => {
  const sortedColIds = Object.keys(sortDescByColId)
    .map((id) => ({ id, time: sortDescTimeByColId[id] }))
    .sort((a, b) => {
      return new Date(a.time ?? 0) - new Date(b.time ?? 0);
    });

  if (!sortedColIds.length) {
    return data;
  }
  const { id: primaryId } = sortedColIds[0];
  const primaryColumnSettings = columnOptions.find(({ id }) => id === primaryId);
  if (!primaryColumnSettings) {
    // Bad config setting-- just silently return un-modified data.
    return data;
  }

  const { typeInfo } = primaryColumnSettings;
  const sortConfigs = getSortConfigs(sortDescByColId, sortedColIds, columnOptions);

  if (typeInfo.isPrimitiveinComplexArrayColumn) {
    const accessors = primaryId.split(".");
    const accessorsWithoutSortKey = accessors.slice(0, accessors.length - 1);

    return data.map((row: any) => {
      const sortedArr = sortTableDataByColumnId(get(row, accessorsWithoutSortKey), sortConfigs);
      return set(row, accessorsWithoutSortKey, sortedArr);
    });
  }
  if (typeInfo.isPrimitiveArrayColumn) {
    const accessors = primaryId.split(".");
    return data.map((row: any) => {
      const sortedArr = sortTableDataByColumnId(get(row, accessors), sortConfigs);
      return set(row, accessors, sortedArr);
    });
  }
  return sortTableDataByColumnId(data, sortConfigs);
};

const omitSortProperties = (columnConfig) => {
  return omit(columnConfig, ["sortDesc", "sortDescTime"]);
};

// TODO(troy): Set sort config by date.
export const setSortConfig = (
  columnConfigs: ?ColumnConfigs,
  columnId: string,
  sortDesc_: ?boolean,
  shiftPressed: boolean
): ColumnConfigs => {
  const newColumnConfigs = {
    ...columnConfigs,
  };

  const columnIdsSortSet = Object.keys(columnConfigs || {}).filter((id) => {
    const columnConfig = columnConfigs && columnConfigs[id];
    return (
      columnConfig &&
      typeof columnConfig === "object" &&
      columnConfig.hasOwnProperty("sortDesc") &&
      typeof columnConfig.sortDesc === "boolean" &&
      id
    );
  });

  if (!shiftPressed) {
    columnIdsSortSet.forEach((id) => {
      newColumnConfigs[id] = omitSortProperties(newColumnConfigs[id]);
    });
  }
  if (typeof sortDesc_ === "boolean") {
    newColumnConfigs[columnId] = {
      ...newColumnConfigs?.[columnId],
      sortDesc: sortDesc_,
      sortDescTime: new Date().getTime(),
    };
  }
  return newColumnConfigs;
};
