// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import MinusIcon from "@mdi/svg/svg/minus-box-outline.svg";
import PlusIcon from "@mdi/svg/svg/plus-box-outline.svg";
import _ from "lodash";
import * as React from "react";
import { hot } from "react-hot-loader/root";
import { useTable, usePagination, useExpanded, useSortBy } from "react-table";
import styled from "styled-components";

import helpContent from "./index.help.md";
import EmptyState from "webviz-core/src/components/EmptyState";
import Flex from "webviz-core/src/components/Flex";
import Icon from "webviz-core/src/components/Icon";
import type { RosPath } from "webviz-core/src/components/MessagePathSyntax/constants";
import MessagePathInput from "webviz-core/src/components/MessagePathSyntax/MessagePathInput";
import parseRosPath from "webviz-core/src/components/MessagePathSyntax/parseRosPath";
import { useCachedGetMessagePathDataItems } from "webviz-core/src/components/MessagePathSyntax/useCachedGetMessagePathDataItems";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import { useMessagesByTopic } from "webviz-core/src/PanelAPI";
import type {
  TableInstance,
  PaginationProps,
  PaginationState,
  ColumnOptions,
} from "webviz-core/src/panels/Table/types";
import type { RosObject } from "webviz-core/src/players/types";
import type { SaveConfig } from "webviz-core/src/types/panels";
import { ROBOTO_MONO } from "webviz-core/src/util/sharedStyleConstants";
import { toolsColorScheme } from "webviz-core/src/util/toolsColorScheme";

const STable = styled.table`
  border: none;
  width: 100%;
`;

const STableRow = styled.tr`
  background-color: ${({ index }: { index: number }) => (index % 2 === 0 ? "inherit" : toolsColorScheme.base.dark)};
  &:hover {
    background-color: ${toolsColorScheme.base.light};
  }
`;

type STableHeaderProps = {|
  id: string,
  isSortedAsc: boolean,
  isSortedDesc: boolean,
|};

const STableHeader = styled.th`
  border-bottom: ${({ isSortedAsc }: STableHeaderProps) =>
    isSortedAsc ? `solid 3px ${toolsColorScheme.blue.medium}` : "none"};
  border-top: ${({ isSortedDesc }: STableHeaderProps) =>
    isSortedDesc ? `solid 3px ${toolsColorScheme.blue.medium}` : "none"}
  border-left: none;
  border-right: none;
  font-weight: bold;
  cursor: pointer;
  width: ${({ id }: STableHeaderProps) => (id === "expander" ? "25px" : "auto")};
  text-align: left;
`;

const STableData = styled.td`
  padding: 4px;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const STableContainer = styled.div`
  overflow: auto;
  display: flex;
  flex-direction: column;
  font-family: ${ROBOTO_MONO};
`;

function sanitizeAccessorPath(accessorPath) {
  return accessorPath.replace(/\./g, "-");
}

function getColumnsFromObject(obj: RosObject, accessorPath: string): ColumnOptions[] {
  const columns = [
    ...Object.keys(obj).map((accessor) => {
      const id = accessorPath ? `${accessorPath}.${accessor}` : accessor;
      return {
        Header: accessor,
        accessor,
        id,
        Cell: ({ value, row }) => {
          if (Array.isArray(value) && typeof value[0] !== "object") {
            return JSON.stringify(value);
          }

          if (typeof value === "object" && value !== null) {
            return <TableCell value={value} row={row} accessorPath={id} />;
          }
          // In case the value is null.
          return `${value}`;
        },
      };
    }),
  ];
  if (!accessorPath) {
    columns.unshift({
      id: "expander",
      // eslint-disable-next-line react/display-name
      Cell: ({ row }) => (
        <Icon medium {...row.getToggleRowExpandedProps()} dataTest={`expand-row-${row.index}`}>
          {row.isExpanded ? <MinusIcon /> : <PlusIcon />}
        </Icon>
      ),
    });
  }

  return columns;
}

const Table = ({ value, accessorPath }: {| value: mixed, accessorPath: string |}) => {
  const isNested = !!accessorPath;
  const columns = React.useMemo(() => {
    if (
      value === null ||
      typeof value !== "object" ||
      (Array.isArray(value) && typeof value[0] !== "object" && value[0] !== null)
    ) {
      return [];
    }

    const rosObject: RosObject = ((Array.isArray(value) ? value[0] || {} : value): any);

    // Strong assumption about structure of data.
    return getColumnsFromObject(rosObject, accessorPath);
  }, [accessorPath, value]);

  const data = React.useMemo(() => (Array.isArray(value) ? value : [value]), [value]);

  const tableInstance: TableInstance<PaginationProps, PaginationState> = useTable(
    {
      columns,
      data,
      initialState: { pageSize: 30 },
    },
    useSortBy,
    useExpanded,
    !isNested ? usePagination : _.noop
  );

  if (
    typeof value !== "object" ||
    value === null ||
    (!isNested && Array.isArray(value) && typeof value[0] !== "object")
  ) {
    return (
      <EmptyState>Cannot render primitive values in a table. Try using the Raw Messages panel instead.</EmptyState>
    );
  }

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    page,
    prepareRow,
    rows,
    canPreviousPage,
    canNextPage,
    pageOptions,
    pageCount,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
    state: { pageIndex, pageSize },
  } = tableInstance;

  return (
    <>
      <STable {...getTableProps()}>
        <thead>
          {headerGroups.map((headerGroup, i) => {
            return (
              <STableRow
                index={0 /* For properly coloring background */}
                key={i}
                {...headerGroup.getHeaderGroupProps()}>
                {headerGroup.headers.map((column) => {
                  return (
                    <STableHeader
                      isSortedAsc={column.isSorted && !column.isSortedDesc}
                      isSortedDesc={column.isSorted && column.isSortedDesc}
                      id={column.id}
                      key={column.id}
                      data-test={`column-header-${sanitizeAccessorPath(column.id)}`}
                      {...column.getHeaderProps(column.getSortByToggleProps())}>
                      {column.render("Header")}
                    </STableHeader>
                  );
                })}
              </STableRow>
            );
          })}
        </thead>
        <tbody {...getTableBodyProps()}>
          {(!isNested ? page : rows).map((row) => {
            prepareRow(row);
            return (
              <STableRow {...row.getRowProps()} key={row.index} index={row.index}>
                {row.cells.map((cell, i) => {
                  return (
                    <STableData key={i} {...cell.getCellProps()}>
                      {cell.render("Cell")}
                    </STableData>
                  );
                })}
              </STableRow>
            );
          })}
        </tbody>
      </STable>
      {!isNested && (
        <div style={{ margin: "4px auto 0" }}>
          <button onClick={() => gotoPage(0)} disabled={!canPreviousPage}>
            {"<<"}
          </button>{" "}
          <button onClick={() => previousPage()} disabled={!canPreviousPage}>
            {"<"}
          </button>{" "}
          <span>
            Page{" "}
            <strong>
              {pageIndex + 1} of {pageOptions.length}
            </strong>{" "}
          </span>
          <button onClick={() => nextPage()} disabled={!canNextPage}>
            {">"}
          </button>{" "}
          <button onClick={() => gotoPage(pageCount - 1)} disabled={!canNextPage}>
            {">>"}
          </button>{" "}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
            }}>
            {[10, 20, 30, 40, 50].map((size) => (
              <option key={size} value={size}>
                Show {size}
              </option>
            ))}
          </select>
        </div>
      )}
    </>
  );
};

const SObjectCell = styled.span`
  font-style: italic;
  cursor: pointer;
`;

const TableCell = ({ value, row, accessorPath }: { value: any, row: any, accessorPath: string }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const toggleIsExpanded = React.useCallback(() => setIsExpanded((expanded) => !expanded), []);

  return row.isExpanded || isExpanded ? (
    <div style={{ position: "relative" }}>
      {isExpanded && (
        <Icon style={{ position: "absolute", top: "2px", right: "2px" }} onClick={toggleIsExpanded}>
          <MinusIcon />
        </Icon>
      )}
      <Table value={value} accessorPath={accessorPath} />
    </div>
  ) : (
    <SObjectCell
      data-test={`expand-cell-${sanitizeAccessorPath(accessorPath)}-${row.index}`}
      onClick={toggleIsExpanded}>
      Object
    </SObjectCell>
  );
};

type Config = {| topicPath: string |};
type Props = { config: Config, saveConfig: SaveConfig<Config> };

function TablePanel({ config, saveConfig }: Props) {
  const { topicPath } = config;
  const onTopicPathChange = React.useCallback((newTopicPath: string) => {
    saveConfig({ topicPath: newTopicPath });
  }, [saveConfig]);

  const topicRosPath: ?RosPath = React.useMemo(() => parseRosPath(topicPath), [topicPath]);
  const topicName = topicRosPath?.topicName || "";
  const msgs = useMessagesByTopic({ topics: [topicName], historySize: 1 })[topicName];
  const cachedGetMessagePathDataItems = useCachedGetMessagePathDataItems([topicPath]);
  const cachedMessages = msgs.length ? cachedGetMessagePathDataItems(topicPath, msgs[0]) : [];

  return (
    <Flex col clip style={{ position: "relative" }}>
      <PanelToolbar helpContent={helpContent}>
        <div style={{ width: "100%", lineHeight: "20px" }}>
          <MessagePathInput index={0} path={topicPath} onChange={onTopicPathChange} inputStyle={{ height: "100%" }} />
        </div>
      </PanelToolbar>
      {!topicPath && <EmptyState>No topic selected</EmptyState>}
      {topicPath && !cachedMessages?.length && <EmptyState>Waiting for next message</EmptyState>}
      {topicPath && cachedMessages && cachedMessages?.length && (
        <STableContainer>
          <Table value={cachedMessages[0].value} accessorPath={""} />
        </STableContainer>
      )}
    </Flex>
  );
}

TablePanel.panelType = "Table";
TablePanel.defaultConfig = {
  topicPath: "",
};

export default hot(Panel<Config>(TablePanel));
