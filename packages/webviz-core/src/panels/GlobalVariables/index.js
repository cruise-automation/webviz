// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import CloseIcon from "@mdi/svg/svg/close.svg";
import { pick } from "lodash";
import * as React from "react";
import styled from "styled-components";

import helpContent from "./index.help.md";
import Flex from "webviz-core/src/components/Flex";
import GlobalVariablesAccessor from "webviz-core/src/components/GlobalVariablesAccessor";
import Icon from "webviz-core/src/components/Icon";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";

type Props = {};

const SButton = styled.button`
  margin-top: 10px;
`;

const SInput = styled.input`
  background: transparent;
  width: 100%;
  color: white;
`;

const canParseJSON = (val) => {
  try {
    JSON.parse(val);
  } catch (e) {
    return false;
  }
  return true;
};

type InputProps = {
  innerRef: { current: null | HTMLInputElement },
  inputVal: string,
  onChange: (Object) => void,
};

type State = {
  inputVal: string,
};

class EditableJSONInput extends React.Component<InputProps, State> {
  constructor(props: InputProps) {
    super(props);
    this.state = {
      inputVal: props.inputVal,
    };
  }

  componentDidUpdate(prevProps: InputProps) {
    if (prevProps.inputVal !== this.props.inputVal) {
      this.setState({ inputVal: this.props.inputVal });
    }
  }

  render() {
    const { inputVal } = this.state;
    const { innerRef, onChange } = this.props;
    const isValid = canParseJSON(inputVal);
    return (
      <SInput
        style={{ color: isValid ? "" : "red" }}
        ref={innerRef}
        type="text"
        value={inputVal}
        onChange={(e) => {
          this.setState({ inputVal: e.target.value });
          onChange(e);
        }}
      />
    );
  }
}

const changeGlobalKey = (newKey, oldKey, globalData, idx, overwriteGlobalData) => {
  const keys = Object.keys(globalData);
  overwriteGlobalData({
    ...pick(globalData, keys.slice(0, idx)),
    [newKey]: globalData[oldKey],
    ...pick(globalData, keys.slice(idx + 1)),
  });
};

const changeGlobalVal = (newVal, datumKey, setGlobalData) => {
  setGlobalData({ [datumKey]: newVal === undefined ? undefined : JSON.parse(String(newVal)) });
};

function GlobalVariables(props: Props): React.Node {
  const input = React.createRef<HTMLInputElement>();

  return (
    <GlobalVariablesAccessor>
      {(globalData, { setGlobalData, overwriteGlobalData }) => {
        return (
          <Flex col>
            <PanelToolbar helpContent={helpContent} floating />
            <table>
              <tbody>
                <tr>
                  <th>key</th>
                  <th>value</th>
                </tr>
                {Object.keys(globalData).map((datumKey, idx) => (
                  <tr key={idx}>
                    <td style={{ display: "flex" }}>
                      <SInput
                        type="text"
                        value={`$${datumKey}`}
                        onChange={(e) => {
                          const newKey = e.target.value.slice(1);
                          changeGlobalKey(newKey.trim(), datumKey, globalData, idx, overwriteGlobalData);
                        }}
                      />
                    </td>
                    <td>
                      <EditableJSONInput
                        innerRef={input}
                        inputVal={JSON.stringify(globalData[datumKey])}
                        onChange={(e) => {
                          const newVal = e.target.value;
                          if (canParseJSON(newVal)) {
                            changeGlobalVal(newVal, datumKey, setGlobalData);
                          }
                        }}
                      />
                    </td>
                    <td style={{ border: 0, background: "none" }}>
                      <Icon
                        onClick={() => {
                          changeGlobalVal(undefined, datumKey, setGlobalData);
                        }}>
                        <CloseIcon />
                      </Icon>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <SButton
              onClick={(e) => {
                setGlobalData({ "": "" });
              }}>
              + add variable
            </SButton>
            <SButton
              onClick={(e) => {
                overwriteGlobalData({});
              }}>
              - clear all
            </SButton>
          </Flex>
        );
      }}
    </GlobalVariablesAccessor>
  );
}

GlobalVariables.panelType = "Global";
GlobalVariables.defaultConfig = {};

export default Panel<{}>(GlobalVariables);
