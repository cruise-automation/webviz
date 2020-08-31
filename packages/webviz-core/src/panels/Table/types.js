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

type CellProps<C, R> = {
  column: C,
  row: R,
  cell: any,
  value: any,
};

type Cell = {
  getCellProps(): {},
  render(props: any): React.Element<any>,
};

type Row = {
  cells: Cell[],
  allCells: Cell[],
  values: any,
  getRowProps(): void,
  index: number,
  original: any,
  subRows: Row[],
  state: {},

  // useExpanded properties.
  getToggleRowExpandedProps(): {},
  isExpanded: boolean,
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

type ColumnInstance = {
  id: string,
  isVisible: boolean,
  render(props: any): React.Element<any>,
  totalLeft: number,
  totalWidth: number,
  getHeaderProps(props: {}): {},
  toggleHidden(hidden: boolean): void,
  getToggleHiddenProps(userProps: {}): {},
  // useSortBy properties.
  isSorted?: boolean,
  isSortedDesc?: boolean,
  getSortByToggleProps(): {},
};

export type ColumnOptions = {|
  Header?: string | (() => ?React.Element<any>),
  accessor?: string,
  columns?: ColumnOptions[],
  Cell?: (props: CellProps<ColumnInstance, Row>) => any,
  id?: string,
  width?: number,
  minWidth?: number,
  maxWidth?: number,
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
  toggleHideColumn(columnId: string, value: ?boolean): void,
  setHiddenColumns(columnIds: string[]): void,
  toggleHideAllColumns(val: ?boolean): void,
  getToggleHideAllColumnsProps(userProps: any): any,
  ...HookInstances,
|};
