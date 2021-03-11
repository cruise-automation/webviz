// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import AlertCircleIcon from "@mdi/svg/svg/alert-circle.svg";
import { cloneDeep, uniq } from "lodash";
import React, { type Node as ReactNode, useMemo, useCallback } from "react";
import { hot } from "react-hot-loader/root";

import Dropdown from "webviz-core/src/components/Dropdown";
import Flex from "webviz-core/src/components/Flex";
import Icon from "webviz-core/src/components/Icon";
import MessagePathInput from "webviz-core/src/components/MessagePathSyntax/MessagePathInput";
import { useLatestMessageDataItem } from "webviz-core/src/components/MessagePathSyntax/useLatestMessageDataItem";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import TextField from "webviz-core/src/components/TextField";
import useGlobalVariables from "webviz-core/src/hooks/useGlobalVariables";
import helpContent from "webviz-core/src/panels/GlobalVariableDropdown/index.help.md";
import naturalSort from "webviz-core/src/util/naturalSort";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

export type GlobalVariableDropdownConfig = {
  topicPath: string,
  globalVariableName: string,
};

type Props = {
  config: GlobalVariableDropdownConfig,
  saveConfig: ($Shape<GlobalVariableDropdownConfig>) => void,
};

export const defaultConfig = {
  topicPath: "",
  globalVariableName: "globalVariable",
};

function GlobalVariableDropdownPanel(props: Props): ReactNode {
  const { config, saveConfig } = props;
  const { topicPath, globalVariableName } = config;
  const { globalVariables, setGlobalVariables, overwriteGlobalVariables } = useGlobalVariables();
  const currentVal = globalVariables[globalVariableName];

  const { onTopicPathChange, onVariableNameChange } = useMemo(
    () => ({
      onTopicPathChange: (newTopicPath: string) => {
        saveConfig({ topicPath: newTopicPath });
      },
      onVariableNameChange: (newGlobalVariableName) => {
        // If a global variable name is edited, immediately set its value and remove the old global variable.
        // Otherwise, the variable won't be set until another dropdown option is selected.
        if (newGlobalVariableName !== globalVariableName) {
          const clonedGlobalVariables = cloneDeep(globalVariables);
          delete clonedGlobalVariables[globalVariableName];
          overwriteGlobalVariables({ ...clonedGlobalVariables, [newGlobalVariableName]: currentVal });
        }
        saveConfig({ globalVariableName: newGlobalVariableName });
      },
    }),
    [globalVariableName, globalVariables, overwriteGlobalVariables, saveConfig, currentVal]
  );

  const onSelect = useCallback((newValue) => {
    setGlobalVariables({ [globalVariableName]: newValue });
  }, [globalVariableName, setGlobalVariables]);

  const baseItem = useLatestMessageDataItem(topicPath, "bobjects");
  const allDropdownOptions = uniq([...(baseItem?.queriedData || []).map(({ value }) => (value: any)), currentVal])
    .filter((val) => val != null && typeof val !== "object")
    .sort(naturalSort());

  return (
    <div>
      <PanelToolbar helpContent={helpContent}>
        <div style={{ width: "100%", lineHeight: "20px" }}>
          <MessagePathInput index={0} path={topicPath} onChange={onTopicPathChange} inputStyle={{ height: "100%" }} />
        </div>
      </PanelToolbar>
      <Flex center style={{ padding: "10px", justifyContent: "flex-start" }}>
        <div>$</div>
        <TextField value={globalVariableName} onChange={onVariableNameChange} validateOnBlur />

        <div style={{ padding: "0px 5px" }}> = </div>

        <Dropdown
          dataTest="global-variable-dropdown-menu"
          value={currentVal}
          text={`${currentVal == null ? "-" : `${currentVal}`}`}
          btnStyle={{ minWidth: "100px", display: "flex", justifyContent: "space-between" }}
          menuStyle={{ minWidth: "100px" }}
          onChange={onSelect}>
          {allDropdownOptions.map((value) => (
            <option value={value} key={value}>
              {`${value}`}
            </option>
          ))}
        </Dropdown>
        {!allDropdownOptions.length && (
          <Icon
            dataTest="global-variable-dropdown-menu-icon"
            small
            tooltip={topicPath ? `Topic path must point to an array of primitives.` : "No topic path entered."}
            style={{ marginLeft: "5px", color: colors.RED1 }}>
            <AlertCircleIcon />
          </Icon>
        )}
      </Flex>
    </div>
  );
}

GlobalVariableDropdownPanel.panelType = "GlobalVariableDropdownPanel";
GlobalVariableDropdownPanel.defaultConfig = defaultConfig;

export default hot(Panel<GlobalVariableDropdownConfig>(GlobalVariableDropdownPanel));
