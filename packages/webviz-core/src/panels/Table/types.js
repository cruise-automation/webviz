// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";

// Since flow-types do not exist for react-table, this is a rough approximation
// of what the types react-table gives us, which is pulled from
// https://react-table.tanstack.com/docs/api/overview.
//
// There is an entry in definitely-typed for react-table here:
// https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/react-table
// which we can use in the future for reference. Unfortunately flowgen could not
// easily convert these types.
export type CellProps<C, R> = {
  column: C,
  row: R,
  cell: any,
  value: any,
};

type Cell = {
  getCellProps(): {},
  render(props: any): React.Element<any>,
};

export type Row = {
  cells: Cell[],
  allCells: Cell[],
  values: any,
  getRowProps(): void,
  index: number,
  original: any,
  subRows: Row[],
  state: {},
};

export type PaginationProps = {|
  pageCount: number,
  page: Row[],
  pageOptions: number[],
  canPreviousPage: boolean,
  canNextPage: boolean,
  gotoPage(index: number): void,
  previousPage(): void,
  nextPage(): void,
  setPageSize(size: number): void,
|};

export type PaginationState = {
  pageSize: number,
  pageIndex: number,
};

export type ColumnInstance = {
  id: string,
  isVisible: boolean,
  render(props: any): React.Element<any>,
  totalLeft: number,
  totalWidth: number,
  getHeaderProps(): {},
  toggleHidden(hidden: boolean): void,
  getToggleHiddenProps(userProps: {}): {},
  // useSortBy properties.
  isSorted?: boolean,
  isSortedDesc?: boolean,
  getSortByToggleProps(): {},
  getResizerProps(): {},
};

export type ColumnFilter = $ReadOnly<{
  value: string,
  comparator: string,
}>;

export type ColumnOptions = {|
  Header?: any,
  accessor?: string,
  columns?: ColumnOptions[],
  Cell?: (props: CellProps<ColumnInstance, Row>) => any,
  id?: string,
  width?: number,
  minWidth?: number,
  maxWidth?: number,
  sortType?: (aRow: any, bRow: any, columnId: string, desc: boolean) => number,
  filter?: (rows: Row[], columnIds: string[], columnFilter: ColumnFilter) => Row[],
|};

type HeaderGroup = {
  headers: ColumnInstance[],
  getHeaderGroupProps(): {},
  getFooterGroupProps(): {},
};

export type TableInstance<HookInstances, HookState> = {|
  state: {
    ...HookState,
  },
  columns: ColumnInstance[],
  allColumns: ColumnInstance[],
  visibleColumns: ColumnInstance[],
  headerGroups: HeaderGroup[],
  footerGroups: HeaderGroup[],
  headers: ColumnInstance[],
  flatHeaders: ColumnInstance[],
  rows: Row[],
  getTableProps(): {},
  getTableBodyProps(): {},
  // Responsible for lazily preparing a row for rendering.
  prepareRow(row: Row): void,
  flatRows: Row[],
  totalColumnsWidth: number,
  toggleHideColumn(accessorPath: string, value: ?boolean): void,
  toggleHideAllColumns(val: ?boolean): void,
  getToggleHideAllColumnsProps(userProps: any): any,
  setFilter(columnId: string, filterValue: any): void,
  ...HookInstances,
|};
export type ConditionalFormat = $ReadOnly<{
  id: string,
  comparator: string,
  primitive: number | string | boolean,
  color: string,
}>;

export type ColumnConfig = {|
  hidden?: boolean,
  conditionalFormats?: ConditionalFormat[],
  isExpanded?: boolean,
  filter?: ColumnFilter,
  sortDesc?: boolean,
  width?: ?number,
|};

export type ColumnConfigKey = $Keys<ColumnConfig>;

export type ColumnConfigs = $ReadOnly<{
  [accessorPath: ?string]: ColumnConfig,
}>;
export type Config = {|
  topicPath: string,
  columnConfigs?: ColumnConfigs,
|};

export type MutableColumnConfigs = $RecursiveMutable<ColumnConfigs>;

export type UpdateConfig = (updater: (Config) => Config) => void;
