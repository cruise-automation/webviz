// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import DeleteIcon from "@mdi/svg/svg/delete.svg";
import PlusIcon from "@mdi/svg/svg/plus.svg";
import { sortBy } from "lodash";
import ColorPicker from "rc-color-picker";
import * as React from "react";
import styled from "styled-components";

import Dropdown from "webviz-core/src/components/Dropdown";
import Icon from "webviz-core/src/components/Icon";
import type { ConditionalFormat, Config } from "webviz-core/src/panels/Table/types";
import { updateConditionalFormat, COMPARATOR_LIST } from "webviz-core/src/panels/Table/utils";
import type { SaveConfig } from "webviz-core/src/types/panels";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

const STableSettings = styled.div`
  overflow: auto;
  align-items: flex-start;
  padding: 16px;
  left: 0;
  display: flex;
  justify-content: center;
  flex-direction: column;
`;

const RemoveButton = styled.div`
  display: none;
  justify-content: center;
  align-items: center;
`;

const SConditionalFormatInput = styled.div`
  margin: 8px 0;
  display: flex;
  align-items: center;
  width: 100%;
  > * {
    flex-grow: unset;
    margin: 0 4px;
  }

  &:hover ${RemoveButton} {
    display: flex;
  }
`;

const SColorPickerWrapper = styled.span`
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
  id: string,
  accessorPath: string,
  updateCondition: (accessorPath: string, conditionalFormatId: string, newConditionalFormat: ConditionalFormat) => void,
  removeCondition: (accessorPath: string, id: string) => void,
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

const ConditionalFormatInput = ({
  id,
  comparator,
  primitive,
  color,
  accessorPath,
  updateCondition,
  removeCondition,
}: ConditionalFormatInputProps) => {
  return (
    <SConditionalFormatInput>
      <span style={{ color: colors.TEXT_MUTED }}>CONDITION</span>
      <SColorPickerWrapper>
        <ColorPicker
          color={color}
          onChange={(newColor: { color: string, alpha: number }) =>
            updateCondition(accessorPath, id, {
              id,
              color: newColor.color,
              comparator,
              primitive,
            })
          }
        />
      </SColorPickerWrapper>
      <input
        type="text"
        placeholder="column name"
        key={`column-id-${id}`}
        value={accessorPath}
        onChange={(e) => {
          updateCondition(e.target.value, id, {
            id,
            color,
            comparator,
            primitive,
          });
        }}
      />

      <Dropdown
        value={comparator}
        key={`comparator-${id}`}
        onChange={(newComparator) => {
          updateCondition(accessorPath, id, {
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
          updateCondition(accessorPath, id, {
            id,
            color,
            comparator,
            primitive: formatPrimitive(e.target.value),
          });
        }}
      />
      <RemoveButton>
        <Icon large onClick={() => removeCondition(accessorPath, id)}>
          <DeleteIcon />
        </Icon>
        <span style={{ color: colors.TEXT_MUTED }}>{"e.g. classification == car"}</span>
      </RemoveButton>
    </SConditionalFormatInput>
  );
};

const DEFAULT_CONDITIONAL_FORMAT: ConditionalFormat = {
  primitive: "",
  color: "#ffffff",
  comparator: "",
};

type Props = { config: Config, saveConfig: SaveConfig<Config> };

const TableSettings = React.memo<Props>(({ config, saveConfig }: Props) => {
  const lastIdRef = React.useRef<number>(-1);
  const conditonalFormats = React.useMemo(() => {
    const conditions = [];
    const columnConfigs = config?.columnConfigs || {};
    for (const accessorPath in columnConfigs) {
      for (const conditionalFormatId in columnConfigs[accessorPath].conditionalFormats) {
        conditions.push({
          ...columnConfigs[accessorPath].conditionalFormats[conditionalFormatId],
          conditionalFormatId,
          accessorPath,
        });
        // Always keep a reference to the largest id so we can increment it.
        // This ensures that the input ordering is deterministic.
        if (Number(conditionalFormatId) > lastIdRef.current) {
          lastIdRef.current = Number(conditionalFormatId);
        }
      }
    }
    // Order needs to be deterministic.
    return sortBy(conditions, ({ conditionalFormatId }) => conditionalFormatId);
  }, [config]);

  const updateCondition = React.useCallback((
    accessorPath: string,
    conditionalFormatId: string,
    newConditionalFormat: ?ConditionalFormat
  ) => {
    const newColumnConfigs = updateConditionalFormat(
      accessorPath,
      conditionalFormatId,
      newConditionalFormat,
      config.columnConfigs
    );
    saveConfig({
      columnConfigs: newColumnConfigs,
    });
  }, [config.columnConfigs, saveConfig]);

  const addNewCondition = React.useCallback(() => {
    updateCondition("", `${lastIdRef.current++}`, DEFAULT_CONDITIONAL_FORMAT);
  }, [updateCondition]);

  const removeCondition = React.useCallback((accessorPath: string, id: string) => {
    updateCondition(accessorPath, id, undefined);
  }, [updateCondition]);

  return (
    <STableSettings>
      {conditonalFormats.map(({ comparator, color, primitive, conditionalFormatId, accessorPath }) => (
        <ConditionalFormatInput
          key={conditionalFormatId}
          id={conditionalFormatId}
          comparator={comparator}
          primitive={primitive}
          color={color}
          accessorPath={accessorPath}
          updateCondition={updateCondition}
          removeCondition={removeCondition}
        />
      ))}
      <button onClick={addNewCondition} style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
        <Icon>
          <PlusIcon />
        </Icon>
        Add new conditional format
      </button>
    </STableSettings>
  );
});

export default TableSettings;
