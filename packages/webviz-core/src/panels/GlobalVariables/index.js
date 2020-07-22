// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { partition, pick, without } from "lodash";
import React, { type Node, useState, useMemo, useRef } from "react";
import { hot } from "react-hot-loader/root";
import ReactInputAutosize from "react-input-autosize";
import styled from "styled-components";

import helpContent from "./index.help.md";
import Flex from "webviz-core/src/components/Flex";
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

const SDeleteIcon = styled.span`
  display: inline-block;
  visibility: hidden;
  font-size: 12px;
  width: 19px;
  cursor: pointer;
  padding-left: 1px;

  &:hover {
    color: white;
  }
`;

const SGlobalVariables = styled.div`
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 8px 0;
  white-space: nowrap;

  table {
    width: 99%;
  }

  tr:nth-child(odd) {
    background-color: #222;
  }

  tr:hover ${SDeleteIcon} {
    visibility: visible;
  }

  td {
    border: none;
    padding: 0 8px;

    input {
      background: none !important;
      color: inherit;
      width: 100%;
      padding-left: 0;
      padding-right: 0;
      min-width: 40px;
    }
  }
`;

const parseJson = (val: string): ?mixed => {
  try {
    return JSON.parse(val);
  } catch (e) {
    return undefined;
  }
};

const keyValMap = { ArrowDown: -1, ArrowUp: 1 };
export function JSONInput(props: {| value: string, onChange: (mixed) => void |}) {
  const [internalValue, setInternalValue] = useState<string>(props.value);
  const lastPropsValue = useRef<string>(props.value);
  if (lastPropsValue.current !== props.value) {
    lastPropsValue.current = props.value;
    setInternalValue(props.value);
  }
  const parsedValue = parseJson(internalValue);
  const isValid = parsedValue !== undefined;
  return (
    <input
      style={{ color: isValid ? "white" : colors.red }}
      data-test="json-input"
      type="text"
      value={internalValue}
      onChange={(e) => {
        setInternalValue(e.target.value);
        const newParsedValue = parseJson(e.target.value);
        if (newParsedValue !== undefined) {
          props.onChange(newParsedValue);
        }
      }}
      onKeyDown={(e) => {
        if (typeof parsedValue === "number" && keyValMap[e.key]) {
          const newParsedValue = parsedValue + keyValMap[e.key];
          setInternalValue(`${newParsedValue}`);
          props.onChange(newParsedValue);
        }
      }}
    />
  );
}

function ValidatedResizingInput(props: {| value: string, onChange: (string) => void, invalidInputs: string[] |}) {
  const [internalValue, setInternalValue] = useState<string>(props.value);
  const lastPropsValue = useRef<string>(props.value);
  if (lastPropsValue.current !== props.value) {
    lastPropsValue.current = props.value;
    setInternalValue(props.value);
  }
  return (
    <ReactInputAutosize
      style={{ color: !props.invalidInputs.includes(internalValue) ? "white" : colors.red }}
      value={`$${internalValue}`}
      onChange={(event) => {
        const value = event.target.value.slice(1);
        setInternalValue(value);
        if (!props.invalidInputs.includes(value)) {
          props.onChange(value);
        }
      }}
    />
  );
}

const changeGlobalKey = (newKey, oldKey, globalVariables, idx, overwriteGlobalVariables) => {
  const keys = Object.keys(globalVariables);
  overwriteGlobalVariables({
    ...pick(globalVariables, keys.slice(0, idx)),
    [newKey]: globalVariables[oldKey],
    ...pick(globalVariables, keys.slice(idx + 1)),
  });
};

function GlobalVariables(): Node {
  const [btnMessage, setBtnMessage] = useState<string>("Copy");
  const { globalVariables, setGlobalVariables, overwriteGlobalVariables } = useGlobalVariables();
  const { linkedGlobalVariables } = useLinkedGlobalVariables();
  const globalVariableNames = Object.keys(globalVariables);
  const linkedGlobalVariablesKeyByName = memoizedGetLinkedGlobalVariablesKeyByName(linkedGlobalVariables);
  const [linked, unlinked] = partition(globalVariableNames, (name) => !!linkedGlobalVariablesKeyByName[name]);

  const url = useMemo(
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
          {linked.map((name, idx) => {
            return (
              <tr key={`linked-${idx}`}>
                <td>
                  <UnlinkGlobalVariables name={name} />
                </td>
                <td width="100%">
                  <JSONInput
                    value={JSON.stringify(globalVariables[name] ?? "")}
                    onChange={(newVal) => setGlobalVariables({ [name]: newVal })}
                  />
                </td>
              </tr>
            );
          })}
          {unlinked.map((name, idx) => (
            <tr key={`unlinked-${idx}`}>
              <td data-test="global-variable-key">
                <SDeleteIcon onClick={() => setGlobalVariables({ [name]: undefined })}>✕</SDeleteIcon>
                <ValidatedResizingInput
                  value={name}
                  onChange={(newKey) =>
                    changeGlobalKey(newKey, name, globalVariables, linked.length + idx, overwriteGlobalVariables)
                  }
                  invalidInputs={without(globalVariableNames, name).concat("")}
                />
              </td>
              <td width="100%">
                <JSONInput
                  value={JSON.stringify(globalVariables[name] ?? "")}
                  onChange={(newVal) => setGlobalVariables({ [name]: newVal })}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Flex style={{ margin: 8 }}>
        <button data-test="add-variable-btn" onClick={() => setGlobalVariables({ "": "" })}>
          + Add variable
        </button>
        <input readOnly style={{ width: "100%" }} type="text" value={url} />
        {document.queryCommandSupported("copy") && (
          <button
            onClick={() => {
              clipboard.copy(url).then(() => {
                setBtnMessage("Copied!");
                setTimeout(() => {
                  setBtnMessage("Copy");
                }, 2000);
              });
            }}>
            {btnMessage}
          </button>
        )}
      </Flex>
    </SGlobalVariables>
  );
}

GlobalVariables.panelType = "Global";
GlobalVariables.defaultConfig = {};

export default hot(Panel<{}>(GlobalVariables));
