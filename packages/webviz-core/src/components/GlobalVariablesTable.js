// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { partition, pick, union, without } from "lodash";
import React, { type Node, useEffect, useMemo, useRef, useState } from "react";
import styled, { css, keyframes } from "styled-components";

import { usePreviousValue } from "../util/hooks";
import Flex from "webviz-core/src/components/Flex";
import { JSONInput } from "webviz-core/src/components/input/JSONInput";
import { ValidatedResizingInput } from "webviz-core/src/components/input/ValidatedResizingInput";
import useGlobalVariables, { type GlobalVariables } from "webviz-core/src/hooks/useGlobalVariables";
import { UnlinkGlobalVariables } from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/GlobalVariableLink";
import { memoizedGetLinkedGlobalVariablesKeyByName } from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/interactionUtils";
import useLinkedGlobalVariables from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/useLinkedGlobalVariables";
import inScreenshotTests from "webviz-core/src/stories/inScreenshotTests";
import clipboard from "webviz-core/src/util/clipboard";
import { GLOBAL_VARIABLES_QUERY_KEY } from "webviz-core/src/util/globalConstants";
import { colors as sharedStyleConstants } from "webviz-core/src/util/sharedStyleConstants";

// The minimum amount of time to wait between showing the global variable update animation again
export const ANIMATION_RESET_DELAY_MS = 3000;

// Returns an keyframe object that animates between two styles– "highlight twice then return to normal"
export const makeFlashAnimation = (initialCssProps: any, highlightCssProps: any) => {
  return css`
    ${keyframes`
      0%, 20%, 100% {
        ${initialCssProps}
      }
      10%, 30%, 80% {
        ${highlightCssProps}
      }
    `}
  `;
};

const DeleteIconWidth = 22;
const SGlobalVariablesTable = styled.div`
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  white-space: nowrap;

  table {
    width: calc(100% + 1px);
  }

  thead {
    user-select: none;
    border-bottom: 1px solid ${sharedStyleConstants.BORDER_LIGHT};
  }

  th,
  td {
    border: none;
  }

  tr:first-child th {
    padding: 8px 2px;
    border: none;
    text-align: left;
    color: ${sharedStyleConstants.LIGHT};
    opacity: 0.6;
    min-width: 120px;

    &:first-child {
      padding-left: ${DeleteIconWidth}px;
    }
  }

  td {
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

const SDeleteIcon = styled.span`
  display: inline-block;
  visibility: hidden;
  font-size: 12px;
  width: ${DeleteIconWidth};
  cursor: pointer;
  padding: 0 5px;

  &:hover {
    color: white;
  }
`;

const FlashRowAnimation = makeFlashAnimation(
  css`
    background: transparent;
  `,
  css`
    background: ${sharedStyleConstants.HIGHLIGHT_MUTED};
  `
);

const AnimationDuration = 3;
const SAnimatedRow = styled.tr`
  background: transparent;
  animation: ${({ animate, skipAnimation }) => (animate && !skipAnimation ? FlashRowAnimation : "none")}
    ${AnimationDuration}s ease-in-out;
  animation-iteration-count: 1;
  animation-fill-mode: forwards;
  border-bottom: 1px solid ${sharedStyleConstants.BORDER_LIGHT};

  &:hover ${SDeleteIcon} {
    visibility: visible;
  }
`;

export function isActiveElementEditable() {
  const activeEl = document.activeElement;
  return activeEl && (activeEl.isContentEditable || activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA");
}

const changeGlobalKey = (newKey, oldKey, globalVariables, idx, overwriteGlobalVariables) => {
  const keys = Object.keys(globalVariables);
  overwriteGlobalVariables({
    ...pick(globalVariables, keys.slice(0, idx)),
    [newKey]: globalVariables[oldKey],
    ...pick(globalVariables, keys.slice(idx + 1)),
  });
};

function GlobalVariablesTable(): Node {
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

  // Don't run the animation when the Table first renders
  const skipAnimation = useRef<boolean>(true);
  useEffect(() => {
    const timeoutId = setTimeout(() => (skipAnimation.current = false), ANIMATION_RESET_DELAY_MS);
    return () => clearTimeout(timeoutId);
  }, []);

  const previousGlobalVariables = usePreviousValue(globalVariables);
  const previousGlobalVariablesRef = useRef<?GlobalVariables>(previousGlobalVariables);
  previousGlobalVariablesRef.current = previousGlobalVariables;

  const [changedVariables, setChangedVariables] = useState<string[]>([]);
  useEffect(
    () => {
      if (skipAnimation.current || isActiveElementEditable()) {
        return;
      }
      const newChangedVariables = union(
        Object.keys(globalVariables),
        Object.keys(previousGlobalVariablesRef.current || {})
      ).filter((name) => {
        const previousValue = previousGlobalVariablesRef.current?.[name];
        return previousValue !== globalVariables[name];
      });

      setChangedVariables(newChangedVariables);
      const timerId = setTimeout(() => setChangedVariables([]), ANIMATION_RESET_DELAY_MS);
      return () => clearTimeout(timerId);
    },
    [globalVariables, skipAnimation]
  );

  return (
    <SGlobalVariablesTable>
      <table>
        <thead>
          <tr>
            <th>Global Variable</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {linked.map((name, idx) => {
            return (
              <SAnimatedRow
                key={`linked-${idx}`}
                skipAnimation={skipAnimation.current}
                animate={changedVariables.includes(name)}>
                <td>
                  <UnlinkGlobalVariables name={name} />
                </td>
                <td width="100%">
                  <JSONInput
                    value={JSON.stringify(globalVariables[name] ?? "")}
                    onChange={(newVal) => setGlobalVariables({ [name]: newVal })}
                  />
                </td>
              </SAnimatedRow>
            );
          })}
          {unlinked.map((name, idx) => (
            <SAnimatedRow
              key={`unlinked-${idx}`}
              skipAnimation={skipAnimation}
              animate={changedVariables.includes(name)}>
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
            </SAnimatedRow>
          ))}
        </tbody>
      </table>
      <Flex style={{ margin: 8 }}>
        <button
          disabled={globalVariables[""] != null}
          onClick={() => setGlobalVariables({ "": "" })}
          data-test="add-variable-btn">
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
    </SGlobalVariablesTable>
  );
}

export default GlobalVariablesTable;
