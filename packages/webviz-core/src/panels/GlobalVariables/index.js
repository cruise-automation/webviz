// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import CloseIcon from "@mdi/svg/svg/close.svg";
import { pick } from "lodash";
import React, { type Node, useState } from "react";
import styled from "styled-components";

import helpContent from "./index.help.md";
import Flex from "webviz-core/src/components/Flex";
import GlobalVariablesAccessor from "webviz-core/src/components/GlobalVariablesAccessor";
import Icon from "webviz-core/src/components/Icon";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import clipboard from "webviz-core/src/util/clipboard";

type Props = {};

const SButtonContainer = styled.div`
  padding: 10px 16px 0;
  display: flex;
`;

const SInput = styled.input`
  background: transparent;
  width: 100%;
  color: white;
`;

const SSection = styled.section`
  margin: 15px;
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
        style={{ color: isValid ? "" : "#f97d96" }}
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

const getUpdatedURL = (globalData) => {
  const queryParams = new URLSearchParams(window.location.search);
  queryParams.set("global-data", JSON.stringify(globalData));
  return `${window.location.host}/?${queryParams.toString()}`;
};

function GlobalVariables(props: Props): Node {
  const input = React.createRef<HTMLInputElement>();
  const [btnMessage, setBtnMessage] = useState("Copy");

  const copyURL = (text) => () => {
    clipboard.copy(text);
    setBtnMessage("Copied!");
  };

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
                          setBtnMessage("Copy");
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
                            setBtnMessage("Copy");
                          }
                        }}
                      />
                    </td>
                    <td style={{ border: 0, background: "none" }}>
                      <Icon
                        onClick={() => {
                          changeGlobalVal(undefined, datumKey, setGlobalData);
                          setBtnMessage("Copy");
                        }}>
                        <CloseIcon />
                      </Icon>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <SButtonContainer>
              <button
                onClick={(e) => {
                  setGlobalData({ "": "" });
                }}>
                + Add variable
              </button>
              <button
                onClick={(e) => {
                  overwriteGlobalData({});
                }}>
                - Clear all
              </button>
            </SButtonContainer>

            <SSection>
              <Flex>
                <input readOnly style={{ width: "100%" }} type="text" value={getUpdatedURL(globalData)} />
                {document.queryCommandSupported("copy") && (
                  <button onClick={copyURL(getUpdatedURL(globalData))}>{btnMessage}</button>
                )}
              </Flex>
            </SSection>
          </Flex>
        );
      }}
    </GlobalVariablesAccessor>
  );
}

GlobalVariables.panelType = "Global";
GlobalVariables.defaultConfig = {};

export default Panel<{}>(GlobalVariables);
