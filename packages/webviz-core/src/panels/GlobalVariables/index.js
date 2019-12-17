// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import TrashCanOutlineIcon from "@mdi/svg/svg/trash-can-outline.svg";
import { pick, partition } from "lodash";
import React, { type Node, useState, useCallback } from "react";
import { hot } from "react-hot-loader/root";
import styled from "styled-components";

import helpContent from "./index.help.md";
import Flex from "webviz-core/src/components/Flex";
import Icon from "webviz-core/src/components/Icon";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import useGlobalVariables from "webviz-core/src/hooks/useGlobalVariables";
import { UnlinkGlobalVariables } from "webviz-core/src/panels/ThreeDimensionalViz/Interactions";
import { memoizedGetLinkedGlobalVariablesKeyByName } from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/interactionUtils";
import useLinkedGlobalVariables from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/useLinkedGlobalVariables";
import inScreenshotTests from "webviz-core/src/stories/inScreenshotTests";
import colors from "webviz-core/src/styles/colors.module.scss";
import clipboard from "webviz-core/src/util/clipboard";
import { GLOBAL_VARIABLES_QUERY_KEY } from "webviz-core/src/util/globalConstants";

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

const SError = styled.div`
  color: ${colors.red};
  margin: 16px;
`;

const SSection = styled.section`
  margin: 15px;
`;

const SBorderlessCell = styled.td`
  border: 0;
  background: none;
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
  onChange: (newVal: string) => void,
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
    const keyValMap = { ArrowDown: -1, ArrowUp: 1 };
    return (
      <SInput
        style={{ color: isValid ? "" : "#f97d96" }}
        ref={innerRef}
        data-test="json-input"
        type="text"
        value={inputVal}
        onChange={(e) => {
          this.setState({ inputVal: e.target.value });
          onChange(e.target.value);
        }}
        onKeyDown={(e) => {
          if (!isValid) {
            return;
          }
          const parsedVal = JSON.parse(inputVal);
          if (isNaN(parsedVal) || !Object.keys(keyValMap).includes(e.key)) {
            return;
          }
          const newVal = parsedVal + keyValMap[e.key];
          this.setState({ inputVal: newVal });
          onChange(newVal);
        }}
      />
    );
  }
}

const changeGlobalKey = (newKey, oldKey, globalVariables, idx, overwriteGlobalVariables) => {
  const keys = Object.keys(globalVariables);
  overwriteGlobalVariables({
    ...pick(globalVariables, keys.slice(0, idx)),
    [newKey]: globalVariables[oldKey],
    ...pick(globalVariables, keys.slice(idx + 1)),
  });
};

const changeGlobalVal = (newVal, name, setGlobalVariables) => {
  setGlobalVariables({ [name]: newVal === undefined ? undefined : JSON.parse(String(newVal)) });
};

function GlobalVariables(props: Props): Node {
  const input = React.createRef<HTMLInputElement>();
  const [btnMessage, setBtnMessage] = useState<string>("Copy");
  const [error, setError] = useState<Node>(null);
  const [inputStr, setInputStr] = useState<string>("");
  const [editingField, setEditingField] = useState<?string>(null);

  const { globalVariables, setGlobalVariables, overwriteGlobalVariables } = useGlobalVariables();
  const { linkedGlobalVariables } = useLinkedGlobalVariables();

  const globalVariableNames = Object.keys(globalVariables);
  const globalVariableNamesWithIdx = globalVariableNames.map((name, idx) => ({ name, idx }));
  const linkedGlobalVariablesKeyByName = memoizedGetLinkedGlobalVariablesKeyByName(linkedGlobalVariables);
  const [linked, unlinked] = partition(
    globalVariableNamesWithIdx,
    ({ name }) => !!linkedGlobalVariablesKeyByName[name]
  );

  function copyURL(text) {
    return () => {
      clipboard.copy(text).then(() => {
        setBtnMessage("Copied!");
        setTimeout(() => {
          setBtnMessage("Copy");
        }, 2000);
      });
    };
  }
  function validateGlobalVariableNewKey(newKey, oldKey) {
    if (newKey === oldKey) {
      return;
    }
    if (newKey === "") {
      return "variable name must not be empty";
    }
    if (newKey in globalVariables && newKey !== editingField) {
      return `variable $${newKey} already exists`;
    }
  }

  function getJsonInputHTML(name: string) {
    return (
      <EditableJSONInput
        innerRef={input}
        inputVal={JSON.stringify(globalVariables[name] || "")}
        onChange={(newVal) => {
          if (canParseJSON(newVal)) {
            changeGlobalVal(newVal, name, setGlobalVariables);
            setBtnMessage("Copy");
          }
        }}
      />
    );
  }

  const getUpdatedURL = useCallback(
    () => {
      const queryParams = new URLSearchParams(window.location.search);
      queryParams.set(GLOBAL_VARIABLES_QUERY_KEY, JSON.stringify(globalVariables));
      if (inScreenshotTests()) {
        return `http://localhost:3000/?${queryParams.toString()}`;
      }
      return `${window.location.host}/?${queryParams.toString()}`;
    },
    [globalVariables]
  );

  return (
    <SGlobalVariables>
      <PanelToolbar helpContent={helpContent} floating />
      <table>
        <tbody>
          <tr>
            <th>key</th>
            <th>value</th>
          </tr>
          {linked.map(({ name, idx }) => {
            return (
              <tr key={idx}>
                <td style={{ paddingRight: "0.6em", verticalAlign: "middle" }}>
                  <UnlinkGlobalVariables name={name} />
                </td>
                <td>{getJsonInputHTML(name)}</td>
                <SBorderlessCell />
              </tr>
            );
          })}
          {unlinked.map(({ name, idx }) => (
            <tr key={idx}>
              <td style={{ paddingLeft: 12 }}>
                <SInput
                  type="text"
                  data-test="global-variable-key-input"
                  value={`$${editingField === name ? inputStr : name}`}
                  onBlur={() => {
                    setError(null);
                    // important to set to null not empty string because empty string is valid name to start with
                    setEditingField(null);
                    // reset to the original valid name as the current input name could be invalid
                    setInputStr(name);
                  }}
                  onKeyDown={() => {
                    // set editingField when start editing
                    if (editingField !== name) {
                      setEditingField(name);
                      setInputStr(name);
                    }
                  }}
                  onChange={(e) => {
                    const newKey = e.target.value.slice(1);
                    setInputStr(newKey);
                    const validationResult = validateGlobalVariableNewKey(newKey.trim(), name);
                    if (validationResult) {
                      setError(
                        <>
                          <p>
                            ${newKey} is not a valid name, using old variable name ${name} instead. Changes will not be
                            saved.
                          </p>
                          <p>Details: {validationResult}</p>
                        </>
                      );
                    } else {
                      setError(null);
                      // update globalVariables right away if the field is valid
                      changeGlobalKey(newKey.trim(), name, globalVariables, idx, overwriteGlobalVariables);
                      setBtnMessage("Copy");
                    }
                  }}
                />
              </td>
              <td>{getJsonInputHTML(name)}</td>
              <SBorderlessCell>
                <Icon
                  onClick={() => {
                    changeGlobalVal(undefined, name, setGlobalVariables);
                    setBtnMessage("Copy");
                  }}>
                  <TrashCanOutlineIcon />
                </Icon>
              </SBorderlessCell>
            </tr>
          ))}
        </tbody>
      </table>
      {error && <SError>{error}</SError>}

      <SButtonContainer>
        <button
          data-test="add-variable-btn"
          onClick={(e) => {
            setInputStr("");
            setError("");
            setEditingField("");
            setGlobalVariables({ "": "" });
          }}>
          + Add variable
        </button>
        <button
          data-test="clear-all-btn"
          onClick={(e) => {
            const newGlobalVariables = linked.reduce((memo, { name }) => {
              memo[name] = undefined;
              return memo;
            }, {});
            overwriteGlobalVariables(newGlobalVariables);
          }}>
          - Clear all
        </button>
      </SButtonContainer>
      <SSection>
        <Flex>
          <input readOnly style={{ width: "100%" }} type="text" value={getUpdatedURL()} />
          {document.queryCommandSupported("copy") && <button onClick={copyURL(getUpdatedURL())}>{btnMessage}</button>}
        </Flex>
      </SSection>
    </SGlobalVariables>
  );
}

GlobalVariables.panelType = "Global";
GlobalVariables.defaultConfig = {};

export default hot(Panel<{}>(GlobalVariables));
