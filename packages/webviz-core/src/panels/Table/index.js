// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import DownArrow from "@mdi/svg/svg/arrow-down.svg";
import UpArrow from "@mdi/svg/svg/arrow-up.svg";
import MenuDownIcon from "@mdi/svg/svg/menu-down.svg";
import MenuRightIcon from "@mdi/svg/svg/menu-right.svg";
import MinusIcon from "@mdi/svg/svg/minus-box-outline.svg";
import PlusIcon from "@mdi/svg/svg/plus-box-outline.svg";
import _ from "lodash";
import * as React from "react";
import { hot } from "react-hot-loader/root";
import { useTable, usePagination, useSortBy, useBlockLayout, useFlexLayout, useResizeColumns } from "react-table";
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
import { getFormattedColor, getLastAccessor } from "webviz-core/src/panels/Table/utils";
import type { RosObject } from "webviz-core/src/players/types";
import type { SaveConfig } from "webviz-core/src/types/panels";
import { createSelectableContext, useChangeDetector, useContextSelector } from "webviz-core/src/util/hooks";
import { ROBOTO_MONO, colors } from "webviz-core/src/util/sharedStyleConstants";
import { toolsColorScheme } from "webviz-core/src/util/toolsColorScheme";

const STable = styled.div`
  border: none;
  width: 100%;
  font-size: 12px;
  display: inline-block;
`;

const STableRow = styled.div`
  border-bottom: 1px solid ${colors.DARK3};
  &:hover {
    background-color: ${colors.DARK1};
  }
`;

const STableHeader = styled.div`
  background-color: ${toolsColorScheme.base.dark};
  border-left: none;
  border-right: none;
  text-align: left;
  padding: 4px 0 4px 8px;
  position: relative;
  height: 22px;
  vertical-align: middle;
`;

const SCell = styled.span`
  padding: 4px 0 4px 8px;
  display: block;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const SPrimitiveCell = styled(SCell)`
  font-family: ${({ value }: { value: string | number }) => (typeof value === "number" ? ROBOTO_MONO : "inherit")};
`;

const SObjectCell = styled(SCell)`
  font-style: italic;
  cursor: pointer;
`;

const STableContainer = styled.div`
  overflow: auto;
`;

const SNavigation = styled.div`
  margin: 4px 0 0;

  button,
  select {
    padding: 4px 8px;
  }
`;

const STableHeaderBorder = styled.div`
  position: absolute;
  right: 0;
  top: 2px;
  bottom: 2px;
  width: 10px;
  &:after {
    content: "";
    position: absolute;
    top: 0px;
    bottom: 0px;
    right: 0px;
    width: 2px;
    background-color: ${colors.TEXT_MUTED};
  }
`;

// Accessor paths are a little like message paths. The accessor path for /foo.bar[0].baz.quux[1] is
// "bar[0].baz[0].quux[1]". Note the strange "[0]" after ".baz" -- nested objects make single-row
// tables.
const sanitizeAccessorPath = (accessorPath) => {
  return accessorPath.replace(/\./g, "-").replace(/[[\]]/g, "");
};

const ALL_INDICES = /\[\d+\]/g;
const accessorPathToGenericPath = (path: string) => path.replace(ALL_INDICES, "");

type UpdateConfig = (updater: (Config) => Config) => void;
const NO_SORT = [];

const ConfigContext = createSelectableContext<Config>();

const DEFAULT_CELL: CellConfig = { sortBy: [], columnWidths: {} };
const DEFAULT_ROW: RowConfig = Object.freeze({});
const DEFAULT_COLUMN_WIDTHS = Object.freeze({});
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

function getColumnsFromObject(
  obj: RosObject,
  accessorPath: string,
  updateConfig: UpdateConfig,
  columnWidths: { [id: string]: number }
): ColumnOptions[] {
  const isTopLevelTable = !accessorPath;
  const columns = [
    ...Object.keys(obj).map((accessor) => {
      const id = accessorPath ? `${accessorPath}.${accessor}` : accessor;
      return {
        Header: accessor,
        accessor,
        id,
        minWidth: 30,
        width: columnWidths[getLastAccessor(id)] ?? 100,
        // eslint-disable-next-line react/display-name
        Cell: ({ value, row }) => {
          const conditonalFormats = useContextSelector(
            ConfigContext,
            React.useCallback((config) => {
              const columnConfigs = config?.columnConfigs;
              return columnConfigs ? columnConfigs[accessorPathToGenericPath(id)]?.conditionalFormats : null;
            }, [])
          );

          if (Array.isArray(value) && typeof value[0] !== "object") {
            return <SCell>{JSON.stringify(value)}</SCell>;
          }

          if (typeof value === "object" && value !== null) {
            const cellPath = `${id}[${row.index}]`;
            return <TableCell value={value} row={row} accessorPath={cellPath} updateConfig={updateConfig} />;
          }

          const color = getFormattedColor(value, conditonalFormats);
          // In case the value is null.
          return <SPrimitiveCell style={{ color }}>{`${value}`}</SPrimitiveCell>;
        },
      };
    }),
  ];
  if (isTopLevelTable) {
    columns.unshift({
      id: "expander",
      maxWidth: 30,
      minWidth: 30,
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

const HeaderCell = ({
  column,
  updateConfig,
  tableAccessorPath,
}: {|
  column: any,
  updateConfig: UpdateConfig,
  tableAccessorPath: string,
|}) => {
  const sanitizedId = sanitizeAccessorPath(column.id);

  if (useChangeDetector([column.isResizing], false) && !column.isResizing) {
    updateConfig((config) => {
      return updateCell(config, tableAccessorPath, {
        columnWidths: {
          ...config.cellConfigs?.[tableAccessorPath]?.columnWidths,
          [getLastAccessor(column.id)]: column.width,
        },
      });
    });
  }

  return (
    <STableHeader
      className="th"
      key={column.id}
      data-test={`column-header-${sanitizedId}`}
      {...column.getHeaderProps()}>
      <span style={{ cursor: "pointer" }} {...column.getSortByToggleProps()} data-test={`sort-${sanitizedId}`}>
        {column.render("Header")}
      </span>
      {column.isSorted ? <Icon>{column.isSortedDesc ? <DownArrow /> : <UpArrow />}</Icon> : null}
      <STableHeaderBorder {...column.getResizerProps()} />
    </STableHeader>
  );
};

const Table = React.memo(
  ({ value, accessorPath, updateConfig }: {| value: mixed, accessorPath: string, updateConfig: UpdateConfig |}) => {
    const isNested = !!accessorPath;

    const columnWidths = useContextSelector(
      ConfigContext,
      React.useCallback((config) => {
        return config.cellConfigs?.[accessorPathToGenericPath(accessorPath)]?.columnWidths ?? DEFAULT_COLUMN_WIDTHS;
      }, [accessorPath])
    );

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
      return getColumnsFromObject(rosObject, accessorPath, updateConfig, columnWidths);
    }, [accessorPath, columnWidths, updateConfig, value]);

    const data = React.useMemo(() => (Array.isArray(value) ? value : [value]), [value]);

    const initialSort = useContextSelector(
      ConfigContext,
      React.useCallback((config) => {
        return config.cellConfigs?.[accessorPath]?.sortBy ?? NO_SORT;
      }, [accessorPath])
    );

    const tableInstance: TableInstance<PaginationProps, PaginationState> = useTable(
      {
        columns,
        data,
        initialState: {
          pageSize: 30,
          sortBy: initialSort,
        },
      },
      useSortBy,
      useResizeColumns,
      isNested ? useFlexLayout : useBlockLayout,
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
        <STable className="table" {...getTableProps()}>
          <div className="thead">
            {headerGroups.map((headerGroup, i) => {
              return (
                <STableRow className="tr" key={i} {...headerGroup.getHeaderGroupProps()}>
                  {headerGroup.headers.map((column) => {
                    return (
                      <HeaderCell
                        tableAccessorPath={accessorPathToGenericPath(accessorPath)}
                        column={column}
                        key={column.id}
                        updateConfig={updateConfig}
                      />
                    );
                  })}
                </STableRow>
              );
            })}
          </div>
          <div className="tbody" {...getTableBodyProps()}>
            {(!isNested ? page : rows).map((row) => {
              prepareRow(row);
              return (
                <STableRow {...row.getRowProps()} key={row.index} index={row.index}>
                  {row.cells.map((cell, i) => {
                    return (
                      <div className="td" key={i} {...cell.getCellProps()}>
                        {cell.render("Cell")}
                      </div>
                    );
                  })}
                </STableRow>
              );
            })}
          </div>
        </STable>
        {!isNested && (
          <SNavigation>
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
          </SNavigation>
        )}
      </>
    );
  }
);

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
      <div style={{ position: "relative", overflow: "hidden" }}>
        {cellIsExpanded && (
          <Icon style={{ position: "absolute", right: "2px", top: "2px", zIndex: 1 }} onClick={toggleIsExpanded}>
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
    // We don't want any config settings persisting for completely different topics.
    saveConfig({ topicPath: newTopicPath, cellConfigs: {} });
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
