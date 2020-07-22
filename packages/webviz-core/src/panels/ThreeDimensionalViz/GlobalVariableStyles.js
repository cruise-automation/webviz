// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import EarthIcon from "@mdi/svg/svg/earth.svg";
import { groupBy } from "lodash";
import React, { useCallback } from "react";
import styled from "styled-components";

import Checkbox from "webviz-core/src/components/Checkbox";
import ExpandingToolbar, { ToolGroup, ToolGroupFixedSizePane } from "webviz-core/src/components/ExpandingToolbar";
import Icon from "webviz-core/src/components/Icon";
import Tooltip from "webviz-core/src/components/Tooltip";
import useGlobalVariables from "webviz-core/src/hooks/useGlobalVariables";
import { JSONInput } from "webviz-core/src/panels/GlobalVariables";
import useLinkedGlobalVariables from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/useLinkedGlobalVariables";
import styles from "webviz-core/src/panels/ThreeDimensionalViz/Layout.module.scss";
import ColorPickerForTopicSettings, {
  PICKER_SIZE,
} from "webviz-core/src/panels/ThreeDimensionalViz/TopicSettingsEditor/ColorPickerForTopicSettings";
import type {
  ColorOverrideSetting,
  ColorOverridesByGlobalVariableName,
} from "webviz-core/src/panels/ThreeDimensionalViz/TopicTree/Layout";
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
`;

export const SName = styled.div`
  display: flex;
  flex: 1 1 auto;
  user-select: none;
  align-items: center;
`;

export const TAB_TYPE_VARIABLES = "Global Variables";
export type TabType = typeof TAB_TYPE_VARIABLES;

type Props = {
  defaultSelectedTab?: ?TabType, // for UI testing
  colorOverridesByGlobalVariable: ColorOverridesByGlobalVariableName,
  setColorOverridesByGlobalVariable: (ColorOverridesByGlobalVariableName) => void,
};

export default function GlobalVariableStyles(props: Props) {
  const { defaultSelectedTab, colorOverridesByGlobalVariable = {}, setColorOverridesByGlobalVariable } = props;
  const [selectedTab, setSelectedTab] = React.useState<any>(defaultSelectedTab);

  const { linkedGlobalVariables } = useLinkedGlobalVariables();
  const linkedGlobalVariablesByName = groupBy(linkedGlobalVariables, ({ name }) => name);

  const updateSettingsForGlobalVariable = useCallback(
    (globalVariableName, settings: { active: boolean, color: Color }) => {
      setColorOverridesByGlobalVariable({
        ...colorOverridesByGlobalVariable,
        [globalVariableName]: settings,
      });
    },
    [colorOverridesByGlobalVariable, setColorOverridesByGlobalVariable]
  );

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
              override={colorOverridesByGlobalVariable[name]}
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
  override,
  rowIndex,
  linkedGlobalVariablesForRow,
  updateSettingsForGlobalVariable,
}: {
  name: string,
  rowIndex: number,
  override: ColorOverrideSetting,
  linkedGlobalVariablesForRow: any,
  updateSettingsForGlobalVariable: (string, settings: ColorOverrideSetting) => void,
}) {
  const { globalVariables, setGlobalVariables } = useGlobalVariables();
  const value = globalVariables[name];

  const { topic, markerKeyPath } = linkedGlobalVariablesForRow[0];
  const tooltip = `${topic}.${markerKeyPath.join(".")} ${
    linkedGlobalVariablesForRow.length > 1 ? `and ${linkedGlobalVariablesForRow.length - 1} more...` : ""
  }`;

  const { active, color } = override || {
    active: false,
    color: hexToColorObj(lineColors[rowIndex % lineColors.length], 1),
  };

  const onChangeActive = useCallback((val) => updateSettingsForGlobalVariable(name, { active: val, color }), [
    color,
    name,
    updateSettingsForGlobalVariable,
  ]);
  const onToggle = useCallback(() => updateSettingsForGlobalVariable(name, { active: !active, color }), [
    active,
    color,
    name,
    updateSettingsForGlobalVariable,
  ]);
  const onChangeValue = useCallback((newVal) => setGlobalVariables({ [name]: newVal }), [name, setGlobalVariables]);
  const onChangeColor = useCallback((_color) => updateSettingsForGlobalVariable(name, { active, color: _color }), [
    active,
    name,
    updateSettingsForGlobalVariable,
  ]);

  return (
    <Tooltip contents={tooltip} placement="top" key={name}>
      <SRow>
        <Checkbox label={""} checked={active} dataTest={`GlobalVariableStylesRow ${name}`} onChange={onChangeActive} />
        <SName onClick={onToggle}>{name}</SName>
        <SInput>
          <JSONInput value={JSON.stringify(value ?? "")} onChange={onChangeValue} />
        </SInput>
        <SColorPicker>
          <ColorPickerForTopicSettings size={PICKER_SIZE.SMALL.name} color={color} onChange={onChangeColor} />
        </SColorPicker>
      </SRow>
    </Tooltip>
  );
}
