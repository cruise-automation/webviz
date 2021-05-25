// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import ArrowRightIcon from "@mdi/svg/svg/arrow-right.svg";
import DeleteIcon from "@mdi/svg/svg/delete.svg";
import PencilIcon from "@mdi/svg/svg/pencil.svg";
import PlusIcon from "@mdi/svg/svg/plus.svg";
import ColorPicker from "rc-color-picker";
import * as React from "react";
import styled from "styled-components";
import uuid from "uuid";

import Checkbox from "webviz-core/src/components/Checkbox";
import Dropdown from "webviz-core/src/components/Dropdown";
import Flex from "webviz-core/src/components/Flex";
import Icon from "webviz-core/src/components/Icon";
import { ConfigContext, TableContext, useColumnConfigValue, SHeaderDropdownItem } from "webviz-core/src/panels/Table";
import type { ConditionalFormat, ColumnInstance } from "webviz-core/src/panels/Table/types";
import { COMPARATOR_LIST } from "webviz-core/src/panels/Table/utils";
import { useContextSelector } from "webviz-core/src/util/hooks";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

const RemoveButton = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`;

const SConditionalFormatInput = styled.div`
  display: flex;
  align-items: center;
  width: 100%;
  > * {
    flex-grow: unset;
    margin-right: 4px;
  }
`;

const SColorPickerWrapper = styled.div`
  .rc-color-picker-trigger {
    border: none;
    box-shadow: none;
    display: inline-block;
    width: 24px;
    height: 24px;
    border-radius: 2px;
  }
`;

type ConditionalFormatInputProps = {
  ...ConditionalFormat,
  setConditionalFormat: (conditionalFormat: ConditionalFormat) => void,
  removeConditionalFormat: (conditionalFormatId: string) => void,
};

const formatPrimitive = (value: any) => {
  if (/^\d+$/.test(value)) {
    return Number(value);
  }
  if (/true/.test(value)) {
    return true;
  }
  if (/false/.test(value)) {
    return false;
  }
  return value;
};

const ColumnCheckbox = ({
  setHideColumn,
  columnId,
}: {
  setHideColumn: (id: string, hide: boolean) => void,
  columnId: string,
}) => {
  const isHidden = useContextSelector(
    ConfigContext,
    React.useCallback((config) => {
      const columnConfig = config.columnConfigs?.[columnId] || {};
      return !!columnConfig.hidden;
    }, [columnId])
  );

  return (
    <Checkbox
      label={columnId}
      checked={!isHidden}
      onChange={(shown) => {
        setHideColumn(columnId, !shown);
      }}
    />
  );
};
type ColumnDropdownProps = {
  setHideColumn: (columnId: string, hide?: boolean) => void,
  toggleAllColumns: (hidden: boolean) => void,
  columns: ColumnInstance[],
};
export const ColumnDropdown = React.memo<ColumnDropdownProps>(
  ({ setHideColumn, toggleAllColumns, columns }: ColumnDropdownProps) => {
    return (
      <Dropdown
        dataTest="column-dropdown"
        style={{
          position: "absolute",
          top: "9px",
          left: "8px",
          zIndex: 1,
        }}
        menuStyle={{
          padding: "8px",
        }}
        toggleComponent={
          <Icon tooltip="Show/hide columns">
            <PencilIcon />
          </Icon>
        }>
        <Flex row>
          <button onClick={() => toggleAllColumns(true)} data-test="hide-all-columns">
            Hide all
          </button>
          <button onClick={() => toggleAllColumns(false)} data-test="show-all-columns">
            Show all
          </button>
        </Flex>
        {columns.map(({ id }) => (
          <ColumnCheckbox columnId={id} key={id} setHideColumn={setHideColumn} />
        ))}
      </Dropdown>
    );
  }
);

const ConditionalFormatInput = ({
  id,
  comparator,
  primitive,
  color,
  removeConditionalFormat,
  setConditionalFormat,
}: ConditionalFormatInputProps) => {
  const colorPickerRef = React.useRef();
  return (
    <SConditionalFormatInput>
      <span style={{ color: colors.TEXT_MUTED }}>if value</span>
      <Dropdown
        value={comparator}
        key={`comparator-${id}`}
        // Because the parent `ConditionalFormatInput` is rendered inside a
        // portal, meaning that calls to `node.contains` on click will fail and
        // close the entire dropdown.
        noPortal
        onChange={(newComparator) => {
          setConditionalFormat({
            id,
            color,
            comparator: newComparator,
            primitive,
          });
        }}>
        {COMPARATOR_LIST.map((field) => (
          <option value={field} key={field}>
            {field}
          </option>
        ))}
      </Dropdown>
      <input
        type="text"
        value={primitive}
        placeholder="primitive value"
        key={`primitive-${id}`}
        onChange={(e) => {
          setConditionalFormat({
            id,
            color,
            comparator,
            primitive: formatPrimitive(e.target.value),
          });
        }}
      />
      <Icon style={{ color: colors.TEXT_MUTED }}>
        <ArrowRightIcon />
      </Icon>
      <SColorPickerWrapper ref={colorPickerRef}>
        <ColorPicker
          color={color}
          getCalendarContainer={() => {
            // Because the parent `ConditionalFormatInput` is rendered inside a
            // portal, meaning that calls to `node.contains` on click will fail and
            // close the entire dropdown.
            return colorPickerRef.current;
          }}
          onChange={(newColor: { color: string, alpha: number }) => {
            setConditionalFormat({
              id,
              color: newColor.color,
              comparator,
              primitive,
            });
          }}
        />
      </SColorPickerWrapper>

      <RemoveButton>
        <Icon large onClick={() => removeConditionalFormat(id)}>
          <DeleteIcon />
        </Icon>
      </RemoveButton>
    </SConditionalFormatInput>
  );
};

export const ConditionaFormatsInput = ({ columnId }: {| columnId: string |}) => {
  const { updateConditionalFormats } = React.useContext(TableContext);
  const conditionalFormats = useColumnConfigValue<"conditionalFormats">(columnId, "conditionalFormats") || [];
  const addConditionalFormat = React.useCallback(() => {
    updateConditionalFormats(columnId, [
      ...conditionalFormats,
      {
        id: uuid.v4(),
        primitive: "",
        color: "#ffffff",
        comparator: "<",
      },
    ]);
  }, [columnId, conditionalFormats, updateConditionalFormats]);
  const setConditionalFormat = React.useCallback((updatedConditionalFormat) => {
    updateConditionalFormats(
      columnId,
      conditionalFormats.map((conditionalFormat) => {
        if (conditionalFormat.id === updatedConditionalFormat.id) {
          return updatedConditionalFormat;
        }
        return conditionalFormat;
      })
    );
  }, [columnId, conditionalFormats, updateConditionalFormats]);

  const removeConditionalFormat = React.useCallback((conditionalFormatId: string) => {
    updateConditionalFormats(
      columnId,
      conditionalFormats.filter((conditionalFormat) => {
        return conditionalFormat.id !== conditionalFormatId;
      })
    );
  }, [columnId, conditionalFormats, updateConditionalFormats]);

  return (
    <>
      <SHeaderDropdownItem onClick={addConditionalFormat}>
        <Icon className="menu-item">
          <PlusIcon />
        </Icon>
        Add formatting
      </SHeaderDropdownItem>
      {conditionalFormats.map((conditionalFormat) => {
        return (
          <SHeaderDropdownItem key={conditionalFormat.id}>
            <ConditionalFormatInput
              columnId={columnId}
              {...conditionalFormat}
              setConditionalFormat={setConditionalFormat}
              removeConditionalFormat={removeConditionalFormat}
            />
          </SHeaderDropdownItem>
        );
      })}
    </>
  );
};
