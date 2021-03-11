// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import MenuDownIcon from "@mdi/svg/svg/menu-down.svg";
import MenuRightIcon from "@mdi/svg/svg/menu-right.svg";
import MinusIcon from "@mdi/svg/svg/minus-box-outline.svg";
import PlusIcon from "@mdi/svg/svg/plus-box-outline.svg";
import _ from "lodash";
import * as React from "react";
import { hot } from "react-hot-loader/root";
import { useTable, usePagination, useSortBy } from "react-table";
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
import TableSettings from "webviz-core/src/panels/Table/TableSettings";
import type {
  Config,
  TableInstance,
  PaginationProps,
  PaginationState,
  ColumnOptions,
  RowConfig,
  CellConfig,
} from "webviz-core/src/panels/Table/types";
import { getFormattedColor } from "webviz-core/src/panels/Table/utils";
import type { RosObject } from "webviz-core/src/players/types";
import type { SaveConfig } from "webviz-core/src/types/panels";
import { createSelectableContext, useChangeDetector, useContextSelector } from "webviz-core/src/util/hooks";
import { ROBOTO_MONO } from "webviz-core/src/util/sharedStyleConstants";
import { toolsColorScheme } from "webviz-core/src/util/toolsColorScheme";

export const STable = styled.table`
  border: none;
  width: 100%;
`;

export const STableRow = styled.tr`
  background-color: ${({ index }: { index: number }) => (index % 2 === 0 ? "inherit" : toolsColorScheme.base.dark)};
`;

type STableHeaderProps = {|
  id: string,
  isSortedAsc: boolean,
  isSortedDesc: boolean,
|};

export const STableHeader = styled.th`
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

export const STableData = styled.td`
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

// Accessor paths are a little like message paths. The accessor path for /foo.bar[0].baz.quux[1] is
// "bar[0].baz[0].quux[1]". Note the strange "[0]" after ".baz" -- nested objects make single-row
// tables.
function sanitizeAccessorPath(accessorPath) {
  return accessorPath.replace(/\./g, "-").replace(/[[\]]/g, "");
}

const ALL_INDICES = /\[\d+\]/g;
const accessorPathToGenericPath = (path: string) => path.replace(ALL_INDICES, "");

type UpdateConfig = (updater: (Config) => Config) => void;
const NO_SORT = [];

const ConfigContext = createSelectableContext<Config>();

const DEFAULT_CELL: CellConfig = { sortBy: [] };
const DEFAULT_ROW: RowConfig = Object.freeze({});
const updateCell = (config: Config, accessorPath: string, newCellConfig: $Shape<CellConfig>) => {
  const newCell = { ...DEFAULT_CELL, ...config.cellConfigs?.[accessorPath], ...newCellConfig };
  return { ...config, cellConfigs: { ...config.cellConfigs, [accessorPath]: newCell } };
};
const updateRow = (config: Config, accessorPath: string, rowIndex: number, newRowConfig: $Shape<RowConfig>) => {
  const newRowConfigs = (config.cellConfigs?.[accessorPath]?.rowConfigs ?? []).slice();
  newRowConfigs[rowIndex] = { ...DEFAULT_ROW, ...newRowConfigs[rowIndex], ...newRowConfig };
  return updateCell(config, accessorPath, { rowConfigs: newRowConfigs });
};

const useIsRowExpanded = (accessorPath, rowIndex) =>
  useContextSelector(
    ConfigContext,
    React.useCallback((config) => !!config.cellConfigs?.[accessorPath]?.rowConfigs?.[rowIndex]?.isExpanded, [
      accessorPath,
      rowIndex,
    ])
  );

function getColumnsFromObject(obj: RosObject, accessorPath: string, updateConfig: UpdateConfig): ColumnOptions[] {
  const isTopLevelTable = !accessorPath;
  const columns = [
    ...Object.keys(obj).map((accessor) => {
      const id = accessorPath ? `${accessorPath}.${accessor}` : accessor;
      return {
        Header: accessor,
        accessor,
        id,
        // eslint-disable-next-line react/display-name
        Cell: ({ value, row }) => {
          const conditonalFormats = useContextSelector(ConfigContext, (config) => {
            const columnConfigs = config?.columnConfigs;
            return columnConfigs ? columnConfigs[accessorPathToGenericPath(id)]?.conditionalFormats : null;
          });

          if (Array.isArray(value) && typeof value[0] !== "object") {
            return JSON.stringify(value);
          }

          if (typeof value === "object" && value !== null) {
            const cellPath = `${id}[${row.index}]`;
            return <TableCell value={value} row={row} accessorPath={cellPath} updateConfig={updateConfig} />;
          }

          const color = getFormattedColor(value, conditonalFormats);
          // In case the value is null.
          return <span style={{ color }}>{`${value}`}</span>;
        },
      };
    }),
  ];
  if (isTopLevelTable) {
    columns.unshift({
      id: "expander",
      // eslint-disable-next-line react/display-name
      Cell: ({ row }) => {
        const isExpanded = useIsRowExpanded(accessorPath, row.index);
        const toggleIsExpanded = React.useCallback(
          () => updateConfig((config) => updateRow(config, accessorPath, row.index, { isExpanded: !isExpanded })),
          [row.index, isExpanded]
        );
        return (
          <Icon medium onClick={toggleIsExpanded} dataTest={`expand-row-${row.index}`}>
            {isExpanded ? <MinusIcon /> : <PlusIcon />}
          </Icon>
        );
      },
    });
  }

  return columns;
}

const Table = React.memo(
  ({ value, accessorPath, updateConfig }: {| value: mixed, accessorPath: string, updateConfig: UpdateConfig |}) => {
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
      return getColumnsFromObject(rosObject, accessorPath, updateConfig);
    }, [accessorPath, updateConfig, value]);

    const data = React.useMemo(() => (Array.isArray(value) ? value : [value]), [value]);

    // The table manages its own sort state. We just provide an initial value, and update the config
    // when the table sort changes.
    const renderCount = React.useRef(0);
    const initialSort = useContextSelector(
      ConfigContext,
      React.useCallback((config) => {
        if (renderCount.current !== 0) {
          return useContextSelector.BAILOUT;
        }
        renderCount.current = renderCount.current + 1;
        return config.cellConfigs?.[accessorPath]?.sortBy ?? NO_SORT;
      }, [accessorPath])
    );
    const tableInstance: TableInstance<PaginationProps, PaginationState> = useTable(
      {
        columns,
        data,
        initialState: { pageSize: 30, sortBy: initialSort },
      },
      useSortBy,
      !isNested ? usePagination : _.noop
    );
    // $FlowFixMe: useSortBy above adds the sortBy prop, but flow doesn't know.
    const { sortBy }: { sortBy: SortBy } = tableInstance.state;
    if (useChangeDetector([sortBy], false)) {
      updateConfig((config) => updateCell(config, accessorPath, { sortBy }));
    }

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
  }
);

const SObjectCell = styled.span`
  font-style: italic;
  cursor: pointer;
`;

const TableCell = React.memo(
  ({
    value,
    row,
    accessorPath,
    updateConfig,
  }: {
    value: any,
    row: any,
    accessorPath: string,
    updateConfig: UpdateConfig,
  }) => {
    // Table accessor path does not have the cell path's row index or column name.
    const tableAccessorPath = accessorPath.replace(/\.?\w+\[\d+\]$/, "");
    const rowIsExpanded = useIsRowExpanded(tableAccessorPath, row.index);
    const cellIsExpanded = useContextSelector(
      ConfigContext,
      React.useCallback((config) => !!config.cellConfigs?.[accessorPath]?.isExpanded, [accessorPath])
    );
    const toggleIsExpanded = React.useCallback(() => {
      updateConfig((config) => updateCell(config, accessorPath, { isExpanded: !cellIsExpanded }));
    }, [accessorPath, cellIsExpanded, updateConfig]);

    return rowIsExpanded || cellIsExpanded ? (
      <div style={{ position: "relative" }}>
        {cellIsExpanded && (
          <Icon style={{ position: "absolute", top: "2px", right: "2px" }} onClick={toggleIsExpanded}>
            <MinusIcon />
          </Icon>
        )}
        <Table value={value} accessorPath={accessorPath} updateConfig={updateConfig} />
      </div>
    ) : (
      <SObjectCell data-test={`expand-cell-${sanitizeAccessorPath(accessorPath)}`} onClick={toggleIsExpanded}>
        Object
      </SObjectCell>
    );
  }
);

type Props = { config: Config, saveConfig: SaveConfig<Config> };
function TablePanel({ config, saveConfig }: Props) {
  const { topicPath } = config;
  const onTopicPathChange = React.useCallback((newTopicPath: string) => {
    saveConfig({ topicPath: newTopicPath });
  }, [saveConfig]);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const toggleIsExpanded = React.useCallback(() => setIsExpanded((expanded) => !expanded), [setIsExpanded]);

  const topicRosPath: ?RosPath = React.useMemo(() => parseRosPath(topicPath), [topicPath]);
  const topicName = topicRosPath?.topicName || "";
  const msgs = useMessagesByTopic({ topics: [topicName], historySize: 1 })[topicName];
  const cachedGetMessagePathDataItems = useCachedGetMessagePathDataItems([topicPath]);
  const cachedMessages = msgs.length ? cachedGetMessagePathDataItems(topicPath, msgs[0]) : [];

  // Ref keeps identity of updateConfig stable, and lets unaffected cells avoid rerendering on
  // unrelated config changes.
  const configRef = React.useRef(config);
  configRef.current = config;
  const updateConfig = React.useCallback((updater: (Config) => Config) => {
    saveConfig(updater(configRef.current));
  }, [saveConfig]);

  return (
    <ConfigContext.Provider value={config}>
      <Flex col clip style={{ position: "relative" }}>
        <Flex col style={{ flexGrow: "unset" }}>
          <PanelToolbar helpContent={helpContent}>
            <Flex row style={{ width: "100%", lineHeight: "20px" }}>
              <Icon
                onClick={toggleIsExpanded}
                large
                dataTest="expand-settings"
                tooltip={isExpanded ? "Collapse settings" : "Expand settings"}>
                {!isExpanded ? <MenuRightIcon /> : <MenuDownIcon />}
              </Icon>
              <MessagePathInput
                index={0}
                path={topicPath}
                onChange={onTopicPathChange}
                inputStyle={{ height: "100%" }}
              />
            </Flex>
          </PanelToolbar>
          {isExpanded && <TableSettings config={config} saveConfig={saveConfig} />}
        </Flex>
        {!topicPath && <EmptyState>No topic selected</EmptyState>}
        {topicPath && !cachedMessages?.length && <EmptyState>Waiting for next message</EmptyState>}
        {topicPath && cachedMessages && !!cachedMessages?.length && (
          <STableContainer>
            <Table value={cachedMessages[0].value} accessorPath={""} updateConfig={updateConfig} />
          </STableContainer>
        )}
      </Flex>
    </ConfigContext.Provider>
  );
}

TablePanel.panelType = "Table";
TablePanel.defaultConfig = {
  topicPath: "",
  cellConfigs: {},
};

export default hot(Panel<Config>(TablePanel));
