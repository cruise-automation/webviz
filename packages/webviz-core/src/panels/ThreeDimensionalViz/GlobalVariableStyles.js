// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import EarthIcon from "@mdi/svg/svg/earth.svg";
import { defaults, groupBy, noop } from "lodash";
import React, { useCallback } from "react";
import styled from "styled-components";
import tinyColor from "tinycolor2";

import Checkbox from "webviz-core/src/components/Checkbox";
import ExpandingToolbar, { ToolGroup, ToolGroupFixedSizePane } from "webviz-core/src/components/ExpandingToolbar";
import Icon from "webviz-core/src/components/Icon";
import { JSONInput } from "webviz-core/src/components/input/JSONInput";
import Tooltip from "webviz-core/src/components/Tooltip";
import useGlobalVariables from "webviz-core/src/hooks/useGlobalVariables";
import useLinkedGlobalVariables from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/useLinkedGlobalVariables";
import type {
  ColorOverride,
  ColorOverrideBySourceIdxByVariable,
} from "webviz-core/src/panels/ThreeDimensionalViz/Layout";
import styles from "webviz-core/src/panels/ThreeDimensionalViz/Layout.module.scss";
import ColorPickerForTopicSettings, {
  PICKER_SIZE,
} from "webviz-core/src/panels/ThreeDimensionalViz/TopicSettingsEditor/ColorPickerForTopicSettings";
import type { Color } from "webviz-core/src/types/Messages";
import { hexToColorObj } from "webviz-core/src/util/colorUtils";
import { lineColors } from "webviz-core/src/util/plotColors";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

export const SRow = styled.div`
  display: flex;
  align-items: center;
  padding: 2px 8px;

  &:hover {
    background-color: ${colors.DARK4};
  }
`;

export const SInput = styled.div`
  input {
    background: none !important;
    color: inherit;
    width: 100%;
    padding-left: 0;
    padding-right: 0;
    min-width: 40px;
    text-align: right;
  }
`;

export const SColorPicker = styled.div`
  margin-left: 8px;
  white-space: nowrap;

  > * {
    margin-left: 4px;
  }
`;

export const SName = styled.div`
  display: flex;
  flex: 1 1 auto;
  user-select: none;
  align-items: center;
`;

export function getDefaultColorOverrideBySourceIdx(defaultColorIndex: number): ColorOverride[] {
  return [
    {
      active: false,
      color: hexToColorObj(lineColors[defaultColorIndex % lineColors.length], 1),
    },
    {
      active: false,
      color: hexToColorObj(
        tinyColor(lineColors[defaultColorIndex % lineColors.length])
          .spin(90) // We change the default color a bit for the second bag. Spin(90) seemed to produce nice results
          .toHexString(),
        1 // Alpha: 1
      ),
    },
  ];
}

export const TAB_TYPE_VARIABLES = "Global Variables";
export type TabType = typeof TAB_TYPE_VARIABLES;

type Props = {
  defaultSelectedTab?: ?TabType, // for UI testing
  colorOverrideBySourceIdxByVariable: ColorOverrideBySourceIdxByVariable,
  setColorOverrideBySourceIdxByVariable: (ColorOverrideBySourceIdxByVariable) => void,
};

export default function GlobalVariableStyles(props: Props) {
  const { defaultSelectedTab, colorOverrideBySourceIdxByVariable = {}, setColorOverrideBySourceIdxByVariable } = props;
  const [selectedTab, setSelectedTab] = React.useState<any>(defaultSelectedTab);

  const { linkedGlobalVariables } = useLinkedGlobalVariables();
  const linkedGlobalVariablesByName = groupBy(linkedGlobalVariables, ({ name }) => name);

  const updateSettingsForGlobalVariable = useCallback((
    globalVariableName,
    settings: { active: boolean, color: Color },
    sourceIdx = 0
  ) => {
    const updatedSettings = new Array(2)
      .fill()
      .map((_, i) => colorOverrideBySourceIdxByVariable[globalVariableName]?.[i]);
    updatedSettings[sourceIdx] = settings;
    setColorOverrideBySourceIdxByVariable({
      ...colorOverrideBySourceIdxByVariable,
      [globalVariableName]: updatedSettings,
    });
  }, [colorOverrideBySourceIdxByVariable, setColorOverrideBySourceIdxByVariable]);

  return (
    <ExpandingToolbar
      tooltip="Global Variables"
      style={{ padding: 0 }}
      icon={
        <Icon style={{ color: "white" }}>
          <EarthIcon />
        </Icon>
      }
      className={styles.buttons}
      selectedTab={selectedTab}
      onSelectTab={setSelectedTab}>
      <ToolGroup name={TAB_TYPE_VARIABLES}>
        <ToolGroupFixedSizePane>
          {Object.keys(linkedGlobalVariablesByName).map((name, i) => (
            <GlobalVariableStylesRow
              key={name}
              name={name}
              rowIndex={i}
              overrides={defaults([], colorOverrideBySourceIdxByVariable[name], getDefaultColorOverrideBySourceIdx(i))}
              linkedGlobalVariablesForRow={linkedGlobalVariablesByName[name]}
              updateSettingsForGlobalVariable={updateSettingsForGlobalVariable}
            />
          ))}
        </ToolGroupFixedSizePane>
      </ToolGroup>
    </ExpandingToolbar>
  );
}

function GlobalVariableStylesRow({
  name,
  overrides,
  linkedGlobalVariablesForRow,
  updateSettingsForGlobalVariable,
}: {
  name: string,
  rowIndex: number,
  overrides: ColorOverride[],
  linkedGlobalVariablesForRow: any,
  updateSettingsForGlobalVariable: (string, settings: ColorOverride, number) => void,
}) {
  const { globalVariables } = useGlobalVariables();
  const value = globalVariables[name];

  const { topic, markerKeyPath } = linkedGlobalVariablesForRow[0];
  const tooltip = `${topic}.${markerKeyPath.join(".")} ${
    linkedGlobalVariablesForRow.length > 1 ? `and ${linkedGlobalVariablesForRow.length - 1} more...` : ""
  }`;

  return (
    <Tooltip contents={tooltip} placement="top" key={name}>
      <SRow>
        <Checkbox
          label={""}
          checked={overrides[0]?.active}
          dataTest={`GlobalVariableStylesRow ${name}`}
          onChange={(_active) =>
            updateSettingsForGlobalVariable(name, { active: _active, color: overrides[0]?.color }, 0)
          }
        />
        <Checkbox
          label={""}
          checked={overrides[1]?.active}
          dataTest={`GlobalVariableStylesRow ${name}`}
          onChange={(_active) =>
            updateSettingsForGlobalVariable(name, { active: _active, color: overrides[1]?.color }, 1)
          }
        />
        <SName>{name}</SName>
        <SInput>
          <JSONInput value={JSON.stringify(value ?? "")} onChange={noop} />
        </SInput>
        <SColorPicker>
          <ColorPickerForTopicSettings
            size={PICKER_SIZE.SMALL.name}
            color={overrides[0]?.color}
            onChange={(_color) =>
              updateSettingsForGlobalVariable(name, { color: _color, active: overrides[0]?.active }, 0)
            }
          />
          <ColorPickerForTopicSettings
            size={PICKER_SIZE.SMALL.name}
            color={overrides[1]?.color}
            onChange={(_color) =>
              updateSettingsForGlobalVariable(name, { color: _color, active: overrides[1]?.active }, 1)
            }
          />
        </SColorPicker>
      </SRow>
    </Tooltip>
  );
}
