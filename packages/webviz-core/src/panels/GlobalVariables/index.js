// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import TrashCanOutlineIcon from "@mdi/svg/svg/trash-can-outline.svg";
import { pick, partition } from "lodash";
import React, { type Node, useState } from "react";
import { hot } from "react-hot-loader/root";
import styled from "styled-components";

import helpContent from "./index.help.md";
import Flex from "webviz-core/src/components/Flex";
import Icon from "webviz-core/src/components/Icon";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import useGlobalData from "webviz-core/src/hooks/useGlobalData";
import { UnlinkGlobalVariables } from "webviz-core/src/panels/ThreeDimensionalViz/Interactions";
import { memoizedGetLinkedGlobalVariablesKeyByName } from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/interactionUtils";
import useLinkedGlobalVariables from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/useLinkedGlobalVariables";
import clipboard from "webviz-core/src/util/clipboard";

type Props = {};
const SGlobalVariables = styled.div`
  display: flex;
  flex-direction: column;
  overflow-y: auto;
`;

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

const SBorderlessCell = styled.td`
  border: 0;
  background: none;
`;

const Placeholder = styled.span`
  display: inline-block;
  height: 32px;
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
  onChange: (SyntheticInputEvent<any>) => void,
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

const changeGlobalVal = (newVal, name, setGlobalData) => {
  setGlobalData({ [name]: newVal === undefined ? undefined : JSON.parse(String(newVal)) });
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

  const { globalData, setGlobalData, overwriteGlobalData } = useGlobalData();
  const { linkedGlobalVariables } = useLinkedGlobalVariables();

  const globalVariableNames = Object.keys(globalData);
  const linkedGlobalVariablesKeyByName = memoizedGetLinkedGlobalVariablesKeyByName(linkedGlobalVariables);
  const [linked, unlinked] = partition(globalVariableNames, (key) => !!linkedGlobalVariablesKeyByName[key]);

  return (
    <SGlobalVariables>
      <PanelToolbar helpContent={helpContent} floating />
      <table>
        <tbody>
          <tr>
            <th>key</th>
            <th>value</th>
          </tr>
          {unlinked.map((name, idx) => (
            <tr key={idx}>
              <td style={{ paddingLeft: 12 }}>
                <SInput
                  type="text"
                  value={`$${name}`}
                  onChange={(e) => {
                    const newKey = e.target.value.slice(1);
                    changeGlobalKey(newKey.trim(), name, globalData, idx, overwriteGlobalData);
                    setBtnMessage("Copy");
                  }}
                />
              </td>
              <td>
                <EditableJSONInput
                  innerRef={input}
                  inputVal={JSON.stringify(globalData[name])}
                  onChange={(e) => {
                    const newVal = e.target.value;
                    if (canParseJSON(newVal)) {
                      changeGlobalVal(newVal, name, setGlobalData);
                      setBtnMessage("Copy");
                    }
                  }}
                />
              </td>
              <SBorderlessCell>
                <Icon
                  onClick={() => {
                    changeGlobalVal(undefined, name, setGlobalData);
                    setBtnMessage("Copy");
                  }}>
                  <TrashCanOutlineIcon />
                </Icon>
              </SBorderlessCell>
            </tr>
          ))}
          {linked.map((name, idx) => {
            return (
              <tr key={name}>
                <td style={{ paddingRight: "0.6em", verticalAlign: "middle" }}>
                  <UnlinkGlobalVariables name={name} />
                </td>
                <td>
                  {globalData[name] == null ? (
                    <Placeholder />
                  ) : (
                    <EditableJSONInput
                      innerRef={input}
                      inputVal={JSON.stringify(globalData[name])}
                      onChange={(e) => {
                        const newVal = e.target.value;
                        if (canParseJSON(newVal)) {
                          changeGlobalVal(newVal, name, setGlobalData);
                          setBtnMessage("Copy");
                        }
                      }}
                    />
                  )}
                </td>
                <SBorderlessCell />
              </tr>
            );
          })}
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
          data-test="clear-all-button"
          onClick={(e) => {
            const newGlobalVariables = linked.reduce((memo, name) => {
              memo[name] = undefined;
              return memo;
            }, {});
            overwriteGlobalData(newGlobalVariables);
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
    </SGlobalVariables>
  );
}

GlobalVariables.panelType = "Global";
GlobalVariables.defaultConfig = {};

export default hot(Panel<{}>(GlobalVariables));
