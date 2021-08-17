// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import ArrowCollapseIcon from "@mdi/svg/svg/arrow-collapse.svg";
import DownArrow from "@mdi/svg/svg/arrow-down.svg";
import ArrowExpandIcon from "@mdi/svg/svg/arrow-expand.svg";
import UpArrow from "@mdi/svg/svg/arrow-up.svg";
import ChevronDownIcon from "@mdi/svg/svg/chevron-down.svg";
import CloseIcon from "@mdi/svg/svg/close.svg";
import FilterIcon from "@mdi/svg/svg/filter.svg";
import FormatFillIcon from "@mdi/svg/svg/format-color-fill.svg";
import * as React from "react";
import { hot } from "react-hot-loader/root";
import { useTable, usePagination, useSortBy, useBlockLayout, useResizeColumns, useFilters } from "react-table";
import { type RosMsgField, type Time } from "rosbag";
import shallowequal from "shallowequal";
import styled from "styled-components";

import helpContent from "./index.help.md";
import Dropdown from "webviz-core/src/components/Dropdown";
import EmptyState from "webviz-core/src/components/EmptyState";
import Flex from "webviz-core/src/components/Flex";
import Icon from "webviz-core/src/components/Icon";
import { rosPrimitives } from "webviz-core/src/components/MessagePathSyntax/constants";
import type { RosPath, MessagePathStructureItem } from "webviz-core/src/components/MessagePathSyntax/constants";
import MessagePathInput from "webviz-core/src/components/MessagePathSyntax/MessagePathInput";
import {
  messagePathStructures,
  traverseStructure,
} from "webviz-core/src/components/MessagePathSyntax/messagePathsForDatatype";
import parseRosPath from "webviz-core/src/components/MessagePathSyntax/parseRosPath";
import { useCachedGetMessagePathDataItems } from "webviz-core/src/components/MessagePathSyntax/useCachedGetMessagePathDataItems";
import { useMessagePipeline } from "webviz-core/src/components/MessagePipeline";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import Tooltip from "webviz-core/src/components/Tooltip";
import TopicToRenderMenu from "webviz-core/src/components/TopicToRenderMenu";
import { useDataSourceInfo, useMessagesByTopic } from "webviz-core/src/PanelAPI";
import { ColumnDropdown, ConditionaFormatsInput } from "webviz-core/src/panels/Table/TableSettings";
import type {
  Config,
  TableInstance,
  PaginationProps,
  PaginationState,
  ColumnOptions,
  UpdateConfig,
  CellProps,
  ColumnInstance,
  Row,
  ColumnConfig,
  ColumnConfigKey,
  ConditionalFormat,
  ColumnFilter,
} from "webviz-core/src/panels/Table/types";
import {
  getFormattedColor,
  getLastAccessor,
  stripLastAccessor,
  sortTimestamps,
  filterColumn,
  COMPARATOR_LIST,
} from "webviz-core/src/panels/Table/utils";
import { type Topic } from "webviz-core/src/players/types";
import type { SaveConfig } from "webviz-core/src/types/panels";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";
import { isComplex, primitiveList } from "webviz-core/src/util/binaryObjects/messageDefinitionUtils";
import { createSelectableContext, useChangeDetector, useContextSelector } from "webviz-core/src/util/hooks";
import { enumValuesByDatatypeAndField, type EnumMap } from "webviz-core/src/util/selectors";
import { ROBOTO_MONO, colors } from "webviz-core/src/util/sharedStyleConstants";
import { rosTimeToUrlTime, DEFAULT_ZERO_TIME, isTimeInRangeInclusive } from "webviz-core/src/util/time";
import { toolsColorScheme } from "webviz-core/src/util/toolsColorScheme";

const STable = styled.div`
  border: none;
  width: 100%;
  font-size: 12px;
  display: inline-block;
`;

const STableRow = styled.div`
  border-bottom: ${({ removeBorder }) => (removeBorder ? "none" : `1px solid ${colors.DARK3}`)};
  &:hover {
    background-color: ${colors.DARK1};
  }
`;

const STableHeader = styled.div`
  display: flex;
  flex-direction: row;
  background-color: ${toolsColorScheme.base.dark};
  border-left: none;
  border-right: none;
  text-align: left;
  padding: 4px 0 4px 8px;
  position: relative;
  height: 22px;
  vertical-align: middle;

  &:hover {
    background-color: ${colors.DARK4};
  }
`;

const STableHeaderDropdown = styled.div`
  cursor: pointer;
  display: flex;
  flex-direction: row;

  & > .dropdown-icon {
    visibility: hidden;
  }

  &:hover {
    & > .dropdown-icon {
      visibility: visible;
    }
  }
`;

const SCell = styled.span`
  padding: 4px 0 4px 8px;
  display: block;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border-bottom: ${({ addBorder }) => (addBorder ? `1px solid ${colors.DARK3}` : "none")};
  flex-basis: 100%;
  box-sizing: border-box;
`;

const SPrimitiveCell = styled(SCell)`
  font-family: ${({ useRoboto }: { useRoboto: boolean }) => (useRoboto ? ROBOTO_MONO : "inherit")};
`;

const SInnerArray = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;

  span:last-child {
    border-bottom: none;
  }
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
  top: 4px;
  bottom: 4px;
  width: 10px;
  &:after {
    content: "";
    position: absolute;
    top: 0px;
    bottom: 0px;
    right: 0px;
    width: 2px;
    opacity: 0.25;
    background-color: ${colors.TEXT_MUTED};
  }

  &:hover::after {
    background-color: ${colors.BLUE};
  }
`;

export const SHeaderDropdownItem = styled.div`
  padding: 8px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;

  .menu-item {
    margin-right: 4px;
  }

  &:hover {
    background-color: ${colors.DARK5};
  }
`;

const SFilterInput = styled(SHeaderDropdownItem)`
  cursor: inherit;
  display: flex;
  align-items: center;
  position: relative;
  padding: 8px 16px;

  input {
    width: 100%;
  }

  & > .clear-filter {
    visibility: hidden;
    position: absolute;
    right: 16px;
    top: 50%;
    transform: translateY(-50%);
  }

  &:hover {
    & > .clear-filter {
      visibility: visible;
    }
  }
`;

const mapValues = (obj: { [columnId: string]: any }, key) => {
  const result = [];
  for (const columnId in obj) {
    result.push({ id: columnId, [key]: obj[columnId] });
  }
  return result;
};

type TableContextProps = {|
  setHideColumn: (columnId: string, hidden: boolean) => void,
  setExpandColumn: (columnId: string, isExpanded: boolean) => void,
  setColumnFilter: (columnId: string, columnFilter: ColumnFilter) => void,
  setColumnWidth: (columnId: string, width: number) => void,
  updateConditionalFormats: (columnId: string, conditionalFormats: ConditionalFormat[]) => void,
|};

export const TableContext = React.createContext<TableContextProps>({
  setHideColumn: () => {},
  setExpandColumn: () => {},
  setColumnFilter: () => {},
  setColumnWidth: () => {},
  updateConditionalFormats: () => {},
});

export const ConfigContext = createSelectableContext<Config>();

export const useColumnConfigValue = <T: ColumnConfigKey>(columnId: string, key: T): ?$ElementType<ColumnConfig, T> => {
  return useContextSelector(
    ConfigContext,
    React.useCallback((config) => {
      if (config.columnConfigs?.[columnId]?.[key]) {
        // $FlowFixMe -- Flow confusing this return value with BAILOUTTOKEN
        return config.columnConfigs?.[columnId]?.[key];
      }
    }, [columnId, key])
  );
};

const useColumnConfigFilterMap = (property: ColumnConfigKey) => {
  return useContextSelector<Config, string[]>(
    ConfigContext,
    React.useCallback((config) => {
      const result: string[] = [];
      for (const key in config?.columnConfigs || {}) {
        const columnConfig = config?.columnConfigs?.[key];
        if (columnConfig && columnConfig.hasOwnProperty(property)) {
          if (columnConfig[property]) {
            result.push(key);
          }
        }
      }
      return result;
    }, [property]),
    { memoResolver: shallowequal }
  );
};

const useColumnConfigFilterReduce = <T: ColumnConfigKey>(
  property: ColumnConfigKey,
  filterTruthy?: boolean
): { [key: string]: $ElementType<ColumnConfig, T> } => {
  return useContextSelector(
    ConfigContext,
    React.useCallback((config) => {
      const result = {};
      for (const key in config?.columnConfigs || {}) {
        const columnConfig = config?.columnConfigs?.[key];
        if (columnConfig && columnConfig.hasOwnProperty(property)) {
          if (filterTruthy && columnConfig[property]) {
            result[key] = columnConfig[property];
          } else if (!filterTruthy) {
            result[key] = columnConfig[property];
          }
        }
      }
      return result;
    }, [filterTruthy, property]),
    { memoResolver: shallowequal }
  );
};

function updateColumnConfigWrapper<T: ColumnConfigKey>(
  updateConfig: UpdateConfig,
  columnId: string,
  key: ColumnConfigKey,
  value: $ElementType<ColumnConfig, T>
) {
  updateConfig((config) => ({
    ...config,
    columnConfigs: {
      ...config.columnConfigs,
      [columnId]: {
        ...config.columnConfigs?.[columnId],
        [key]: value,
      },
    },
  }));
}

export const DEFAULT_FILTER = { comparator: "==", value: "" };
type PrimitiveCellProps = {|
  columnId: string,
  value: any,
  type: string,
  enumValue?: ?string,
  isNestedArray?: boolean,
|};

const TimeCell = ({
  value,
  color,
  isNestedArray,
}: {
  value: Time,
  type: "time" | "duration",
  color: ?string,
  isNestedArray: ?boolean,
}) => {
  const renderedValue = rosTimeToUrlTime(value);
  const { seekPlayback, startTime, endTime } = useMessagePipeline(
    React.useCallback((state) => {
      const { activeData } = state.playerState;
      return {
        seekPlayback: state.seekPlayback,
        startTime: (activeData && activeData.startTime) || DEFAULT_ZERO_TIME,
        endTime: (activeData && activeData.endTime) || DEFAULT_ZERO_TIME,
      };
    }, [])
  );

  const isWithinRange = isTimeInRangeInclusive(value, startTime, endTime);

  return (
    <SPrimitiveCell
      onClick={() => isWithinRange && seekPlayback(value)}
      style={{
        color,
        cursor: isWithinRange ? "pointer" : "inherit",
        textDecoration: isWithinRange ? "underline" : "inherit",
      }}
      addBorder={isNestedArray}
      useRoboto>
      <Tooltip
        contents={isWithinRange ? "Seek to time" : "Cannot seek. Time not within range of current bag."}
        delay={1000}
        placement={"left"}>
        <span>{renderedValue}</span>
      </Tooltip>
    </SPrimitiveCell>
  );
};

const PrimitiveCell = ({ value, type, enumValue, isNestedArray, columnId }: PrimitiveCellProps) => {
  const conditionalFormats = useColumnConfigValue<"conditionalFormats">(columnId, "conditionalFormats");
  let renderedValue = value;
  if (enumValue) {
    renderedValue = `${enumValue} (${value})`;
  }

  const color = conditionalFormats && getFormattedColor(renderedValue, conditionalFormats);
  if (type === "time" || type === "duration") {
    return <TimeCell type={type} color={color} value={value} isNestedArray={isNestedArray} />;
  }

  return (
    <SPrimitiveCell
      style={{ color }}
      addBorder={isNestedArray}
      useRoboto={typeof renderedValue === "number" || type === "time" || type === "duration" || enumValue}>
      <Tooltip contents={renderedValue} delay={1000} placement={"left"}>
        <span>{`${renderedValue}`}</span>
      </Tooltip>
    </SPrimitiveCell>
  );
};

const ComplexCell = ({ columnId, disableExpansion }: {| columnId: string, disableExpansion?: boolean |}) => {
  const { setExpandColumn } = React.useContext(TableContext);

  const expandColumn = React.useCallback(() => {
    if (disableExpansion) {
      return;
    }
    setExpandColumn(columnId, true);
  }, [columnId, disableExpansion, setExpandColumn]);

  return (
    <Tooltip contents={!disableExpansion ? "Expand column" : "Cannot expand nested submessages"} delay={1000}>
      <span
        style={{
          cursor: !disableExpansion ? "pointer" : "not-allowed",
          display: "block",
          width: "100%",
          height: "100%",
        }}
        onClick={expandColumn}>
        {"..."}
      </span>
    </Tooltip>
  );
};

type HeaderCellProps = {|
  column: any,
  updateConfig: UpdateConfig,
  rosMsgField: ?RosMsgField,
  tableAccessorPath: string,
  setHideColumn: (columnId: string, hidden: boolean) => void,
  toggleExpandColumn: (columnId: string, isExpanded: boolean) => void,
  setColumnFilter: (columnId: string, columnFilter: ColumnFilter) => void,
  setColumnWidth: (columnId: string, width: number) => void,
|};

function getColumnsFromDatatype(
  datatype: string,
  fields: RosMsgField[],
  accessorPath: string,
  columnWidths: { [key: string]: ?number },
  enumMap: EnumMap,
  expandedColumns: string[],
  datatypes: RosDatatypes,
  parentField: ?RosMsgField = null
): ColumnOptions[] {
  const columns = fields
    // "*webviz_enum" fields are added by rosbagjs for constants, so there's no
    // reason to show them in the UI.
    .filter((field) => !field.name.endsWith("webviz_enum"))
    .map((field) => {
      const { name: accessor } = field;
      // NOTE: react-table mutates `column.id`, so it's best not rely on it. They
      // do set `column.originalId` but it's not a guranteed property.
      const columnId = accessorPath ? `${accessorPath}.${accessor}` : accessor;
      const lastAccessor = getLastAccessor(columnId);
      const isComplexType = isComplex(field.type);
      const isExpanded = expandedColumns.includes(columnId);

      const Cell = ({ value }: CellProps<ColumnInstance, Row>) => {
        if (parentField?.isArray) {
          if (rosPrimitives.includes(field.type)) {
            return (
              <SInnerArray>
                {value.map((obj, i) => {
                  const innerValue = obj[field.name];
                  return (
                    <PrimitiveCell
                      columnId={columnId}
                      value={innerValue}
                      type={field.type}
                      enumValue={enumMap?.[datatype]?.[lastAccessor]?.[innerValue]}
                      isNestedArray
                      key={i}
                    />
                  );
                })}
              </SInnerArray>
            );
          }
          // TODO(troy): Allow for successive nesting.
          return <ComplexCell columnId={columnId} disableExpansion />;
        }

        if (rosPrimitives.includes(field.type) && field.isArray) {
          return (
            <SInnerArray>
              {value.map((innerValue, i) => {
                return <PrimitiveCell columnId={columnId} value={innerValue} type={field.type} isNestedArray key={i} />;
              })}
            </SInnerArray>
          );
        }

        if (isComplexType) {
          return <ComplexCell columnId={columnId} />;
        }

        return (
          <PrimitiveCell
            columnId={columnId}
            value={value}
            type={field.type}
            enumValue={enumMap?.[datatype]?.[lastAccessor]?.[value]}
          />
        );
      };

      const HeaderCell = ({ column }: HeaderCellProps) => {
        const { setExpandColumn, setHideColumn, setColumnFilter, setColumnWidth } = React.useContext(TableContext);
        if (useChangeDetector([column.isResizing], false) && !column.isResizing) {
          setColumnWidth(columnId, column.width);
        }

        const isColumnExpanded = useColumnConfigValue<"isExpanded">(columnId, "isExpanded");
        const filter = useColumnConfigValue<"filter">(columnId, "filter") || DEFAULT_FILTER;
        const conditionalFormats = useColumnConfigValue<"conditionalFormats">(columnId, "conditionalFormats") || [];

        const setFilterValueCallback = React.useCallback((e) => {
          setColumnFilter(columnId, { ...filter, value: e.target.value });
        }, [filter, setColumnFilter]);

        const setFilterValueComparator = React.useCallback((newComparator) => {
          setColumnFilter(columnId, { ...filter, comparator: newComparator });
        }, [filter, setColumnFilter]);

        const renderedHeader = getLastAccessor(columnId);

        return (
          <Flex>
            <Dropdown
              dataTest={`column-header-dropdown-${columnId}`}
              style={{ width: "100%" }}
              menuStyle={{ minWidth: "150px" }}
              toggleComponent={
                <STableHeaderDropdown>
                  <Tooltip contents={renderedHeader} delay={1000}>
                    <span>{renderedHeader}</span>
                  </Tooltip>
                  {column.isSorted ? <Icon>{column.isSortedDesc ? <DownArrow /> : <UpArrow />}</Icon> : null}
                  {column.filterValue ? (
                    <Icon>
                      <FilterIcon />
                    </Icon>
                  ) : null}
                  {!!conditionalFormats.length && (
                    <Icon>
                      <FormatFillIcon />
                    </Icon>
                  )}
                  <Icon className="dropdown-icon">
                    <ChevronDownIcon />
                  </Icon>
                </STableHeaderDropdown>
              }>
              {!isComplexType && !parentField?.isArray ? (
                <>
                  <SFilterInput>
                    <div style={{ color: colors.TEXT_MUTED, whiteSpace: "nowrap" }}>if value</div>
                    <Dropdown
                      value={filter.comparator}
                      key={"filter-comparator"}
                      noPortal
                      onChange={setFilterValueComparator}>
                      {COMPARATOR_LIST.map((comparator) => (
                        <option value={comparator} key={comparator}>
                          {comparator}
                        </option>
                      ))}
                    </Dropdown>
                    <input placeholder="filter" value={filter.value} onChange={setFilterValueCallback} />
                    {column?.filterValue?.value && (
                      <Icon
                        onClick={() => setColumnFilter(columnId, { ...filter, value: "" })}
                        className="clear-filter"
                        tooltip="Clear filter">
                        <CloseIcon />
                      </Icon>
                    )}
                  </SFilterInput>
                  <SHeaderDropdownItem data-test={"sort-column"} {...column.getSortByToggleProps()}>
                    <Tooltip contents={"To multi-sort, hold shift and click."} delay={500}>
                      <Flex style={{ alignItems: "center" }}>
                        <Icon className="menu-item">
                          {column.isSorted ? column.isSortedDesc ? <CloseIcon /> : <DownArrow /> : <UpArrow />}
                        </Icon>
                        Sort {column.isSorted ? (column.isSortedDesc ? "(clear)" : "(desc)") : "(asc)"}
                      </Flex>
                    </Tooltip>
                  </SHeaderDropdownItem>
                </>
              ) : (
                !parentField?.isArray && (
                  <SHeaderDropdownItem
                    data-test={"toggle-expand-column"}
                    onClick={() => {
                      setExpandColumn(columnId, !isColumnExpanded);
                    }}
                    key={"toggle-expand"}>
                    <Icon className="menu-item">{isColumnExpanded ? <ArrowCollapseIcon /> : <ArrowExpandIcon />}</Icon>
                    {isColumnExpanded ? "Collapse" : "Expand"} column
                  </SHeaderDropdownItem>
                )
              )}
              <SHeaderDropdownItem
                data-test={"hide-column"}
                onClick={() => {
                  setHideColumn(columnId, true);
                }}
                key={"hide"}>
                <Icon className="menu-item">
                  <CloseIcon />
                </Icon>
                Hide column
              </SHeaderDropdownItem>
              {!isComplexType && <ConditionaFormatsInput columnId={columnId} />}
            </Dropdown>
          </Flex>
        );
      };

      const subColumns =
        isComplexType && isExpanded
          ? getColumnsFromDatatype(
              field.type,
              datatypes[field.type].fields.filter(({ isConstant }) => !isConstant),
              columnId,
              columnWidths,
              enumMap,
              expandedColumns,
              datatypes,
              field
            )
          : undefined;

      const columnAccessor = !parentField?.isArray ? columnId : stripLastAccessor(columnId);
      const columnOptions: ColumnOptions = {
        Header: HeaderCell,
        accessor: columnAccessor,
        id: columnId,
        minWidth: 30,
        width: columnWidths?.[columnId] ?? 100,
        Cell: isExpanded ? undefined : Cell,
        columns: subColumns,
        filter: filterColumn.bind(null, field.type, columnId),
      };

      if (field.type === "time" || field.type === "duration") {
        columnOptions.sortType = sortTimestamps;
      }

      return columnOptions;
    });

  return columns;
}

const Table = React.memo(
  ({
    msg,
    accessorPath,
    updateConfig,
    msgDatatype,
    enumMap,
  }: {|
    msg: mixed,
    accessorPath: string,
    updateConfig: UpdateConfig,
    msgDatatype: string,
    enumMap: EnumMap,
  |}) => {
    const { datatypes } = useDataSourceInfo();

    const hiddenColumns = useColumnConfigFilterMap("hidden");
    const expandedColumns = useColumnConfigFilterMap("isExpanded");

    const initialFilters = useColumnConfigFilterReduce("filter");
    const initialSortBy = useColumnConfigFilterReduce<"sortDesc">("sortDesc");
    const columnWidths = useColumnConfigFilterReduce<"width">("width", true);

    const fields = React.useMemo(
      () => (datatypes[msgDatatype] ? datatypes[msgDatatype].fields.filter(({ isConstant }) => !isConstant) : []),
      [datatypes, msgDatatype]
    );

    const columns = React.useMemo(
      () =>
        getColumnsFromDatatype(msgDatatype, fields, accessorPath, columnWidths, enumMap, expandedColumns, datatypes),
      [msgDatatype, fields, accessorPath, columnWidths, enumMap, expandedColumns, datatypes]
    );

    const data = React.useMemo(() => (Array.isArray(msg) ? msg : [msg]), [msg]);

    const tableInstance: TableInstance<PaginationProps, PaginationState> = useTable(
      {
        columns,
        data,
        initialState: {
          pageSize: 30,
          sortBy: mapValues(initialSortBy, "desc"),
          hiddenColumns,
          filters: mapValues(initialFilters, "value"),
        },
      },
      useFilters,
      useSortBy,
      useResizeColumns,
      useBlockLayout,
      usePagination
    );

    const updateColumnConfig = React.useCallback((...args) => updateColumnConfigWrapper(updateConfig, ...args), [
      updateConfig,
    ]);

    // $FlowFixMe: useSortBy above adds the sortBy prop, but flow doesn't know.
    const { sortBy }: { sortBy: SortBy[] } = tableInstance.state;
    if (useChangeDetector([sortBy], false)) {
      sortBy.forEach((sort) => {
        updateColumnConfig(sort.id, "sortDesc", sort.desc);
      });
    }

    if (primitiveList.has(msgDatatype)) {
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
      canPreviousPage,
      canNextPage,
      pageOptions,
      pageCount,
      gotoPage,
      nextPage,
      previousPage,
      setPageSize,
      toggleHideColumn,
      setFilter,
      allColumns,
      toggleHideAllColumns: rcToggleHideAllColumns,
      state: { pageIndex, pageSize },
    } = tableInstance;

    const setHideColumn = React.useCallback((columnId: string, hidden?: boolean) => {
      toggleHideColumn(columnId, hidden);
      updateColumnConfig(columnId, "hidden", hidden);
    }, [toggleHideColumn, updateColumnConfig]);

    const setExpandColumn = React.useCallback((columnId: string, isExpanded: boolean) => {
      updateColumnConfig(columnId, "isExpanded", isExpanded);
    }, [updateColumnConfig]);

    const setColumnFilter = React.useCallback((columnId: string, filter: ColumnFilter) => {
      setFilter(columnId, filter);
      updateColumnConfig(columnId, "filter", filter);
    }, [setFilter, updateColumnConfig]);

    const setColumnWidth = React.useCallback((columnId: string, width: number) => {
      updateColumnConfig(columnId, "width", width);
    }, [updateColumnConfig]);

    const toggleAllColumns = React.useCallback((hidden: boolean) => {
      rcToggleHideAllColumns(hidden);
      updateConfig((config) => {
        const ids = allColumns.map(({ id }) => id);
        const columnConfigs = { ...config.columnConfigs };
        ids.forEach((id) => {
          columnConfigs[id] = {
            ...columnConfigs[id],
            hidden,
          };
        });
        return {
          ...config,
          columnConfigs,
        };
      });
    }, [allColumns, rcToggleHideAllColumns, updateConfig]);

    const updateConditionalFormats = React.useCallback((columnId: string, conditionalFormats: ConditionalFormat[]) => {
      updateColumnConfig(columnId, "conditionalFormats", conditionalFormats);
    }, [updateColumnConfig]);

    return (
      <>
        <TableContext.Provider
          value={{
            setHideColumn,
            setExpandColumn,
            setColumnFilter,
            setColumnWidth,
            updateConditionalFormats,
          }}>
          <STable className="table" {...getTableProps()}>
            <ColumnDropdown
              columns={allColumns}
              updateConfig={updateConfig}
              setHideColumn={setHideColumn}
              toggleAllColumns={toggleAllColumns}
            />
            <div className="thead">
              {headerGroups.map((headerGroup, i) => {
                return (
                  <STableRow removeBorder className="tr" key={i} {...headerGroup.getHeaderGroupProps()}>
                    {headerGroup.headers.map((column) => {
                      return (
                        <STableHeader className="th" key={column.id} {...column.getHeaderProps()}>
                          {column.render("Header")}
                          <STableHeaderBorder {...column.getResizerProps()} />
                        </STableHeader>
                      );
                    })}
                  </STableRow>
                );
              })}
            </div>
            <div className="tbody" {...getTableBodyProps()}>
              {page.map((row) => {
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
        </TableContext.Provider>
      </>
    );
  }
);

type Props = { config: Config, saveConfig: SaveConfig<Config> };
function TablePanel({ config, saveConfig }: Props) {
  const { topicPath } = config;
  const onTopicPathChange = React.useCallback((newTopicPath: string) => {
    // We don't want any config settings persisting for completely different topics.
    saveConfig({ topicPath: newTopicPath, columnConfigs: {} });
  }, [saveConfig]);

  const { topics, datatypes } = useDataSourceInfo();

  const topicRosPath: ?RosPath = React.useMemo(() => parseRosPath(topicPath), [topicPath]);
  const topic: ?Topic = React.useMemo(
    () => topicRosPath && topics.find(({ name }) => name === topicRosPath.topicName),
    [topicRosPath, topics]
  );

  const topicName = topicRosPath?.topicName || "";

  const rootStructureItem: ?MessagePathStructureItem = React.useMemo(() => {
    if (!topic || !topicRosPath) {
      return;
    }
    return traverseStructure(messagePathStructures(datatypes)[topic.datatype], topicRosPath.messagePath).structureItem;
  }, [datatypes, topic, topicRosPath]);

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

  const msgDatatype: ?string = React.useMemo(() => {
    if (!rootStructureItem) {
      return null;
    }
    switch (rootStructureItem.structureType) {
      case "message":
        return rootStructureItem.datatype;
      case "array":
        if (rootStructureItem.next.structureType === "primitive") {
          return rootStructureItem.next.primitiveType;
        }
        return rootStructureItem.next.datatype;
      case "primitive":
        return rootStructureItem.primitiveType;
      default:
        return null;
    }
  }, [rootStructureItem]);

  const enumMap = React.useMemo(() => {
    return enumValuesByDatatypeAndField(datatypes);
  }, [datatypes]);

  return (
    <ConfigContext.Provider value={config}>
      <Flex col clip style={{ position: "relative" }}>
        <Flex col style={{ flexGrow: "unset" }}>
          <PanelToolbar
            helpContent={helpContent}
            additionalIcons={
              <TopicToRenderMenu
                topicToRender={topicName}
                onChange={(_topic) => {
                  // Maintain the path syntax so switching between base and feature topics is easy for users
                  const path = topicPath.match(/\.(.+)/);
                  const newTopicPath = path && path[1] ? `${_topic}.${path[1]}` : _topic;
                  saveConfig({ topicPath: newTopicPath });
                }}
                topics={topics}
                singleTopicDatatype={topic?.datatype}
                defaultTopicToRender={""}
              />
            }>
            <Flex row style={{ width: "100%", lineHeight: "20px", marginLeft: "16px" }}>
              <MessagePathInput
                index={0}
                path={topicPath}
                onChange={onTopicPathChange}
                inputStyle={{ height: "100%" }}
              />
            </Flex>
          </PanelToolbar>
        </Flex>
        {!topicPath && <EmptyState>No topic selected</EmptyState>}
        {topicPath && !cachedMessages?.length && <EmptyState>Waiting for next message</EmptyState>}
        {topicPath && cachedMessages && !!cachedMessages?.length && msgDatatype && (
          <STableContainer>
            <Table
              msg={cachedMessages.length > 1 ? cachedMessages.map(({ value }) => value) : cachedMessages[0].value}
              msgDatatype={msgDatatype}
              accessorPath={""}
              updateConfig={updateConfig}
              enumMap={enumMap}
            />
          </STableContainer>
        )}
      </Flex>
    </ConfigContext.Provider>
  );
}

TablePanel.panelType = "Table";
TablePanel.defaultConfig = {
  topicPath: "",
};

export default hot(Panel<Config>(TablePanel));
