// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import CloseIcon from "@mdi/svg/svg/close.svg";
import DotsVerticalIcon from "@mdi/svg/svg/dots-vertical.svg";
import { partition, pick, union, without } from "lodash";
import React, { type Node, useEffect, useMemo, useCallback, useRef, useState } from "react";
import styled, { css, keyframes } from "styled-components";

import { usePreviousValue } from "../util/hooks";
import ChildToggle from "webviz-core/src/components/ChildToggle";
import Flex from "webviz-core/src/components/Flex";
import Icon from "webviz-core/src/components/Icon";
import { JSONInput } from "webviz-core/src/components/input/JSONInput";
import { ValidatedResizingInput } from "webviz-core/src/components/input/ValidatedResizingInput";
import Menu, { Item } from "webviz-core/src/components/Menu";
import Tooltip from "webviz-core/src/components/Tooltip";
import useGlobalVariables, { type GlobalVariables } from "webviz-core/src/hooks/useGlobalVariables";
import { memoizedGetLinkedGlobalVariablesKeyByName } from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/interactionUtils";
import useLinkedGlobalVariables from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/useLinkedGlobalVariables";
import { colors as sharedColors } from "webviz-core/src/util/sharedStyleConstants";

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

const SGlobalVariablesTable = styled.div`
  display: flex;
  flex-direction: column;
  white-space: nowrap;
  color: ${sharedColors.LIGHT};

  table {
    width: calc(100% + 1px);
  }

  thead {
    user-select: none;
    border-bottom: 1px solid ${sharedColors.BORDER_LIGHT};
  }

  th,
  td {
    padding: 0px 16px;
    line-height: 100%;
    border: none;
  }

  tr:first-child th {
    padding: 8px 16px;
    border: none;
    text-align: left;
    color: rgba(255, 255, 255, 0.6);
    min-width: 120px;
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
    &:last-child {
      color: rgba(255, 255, 255, 0.6);
    }
  }
`;

const SIconWrapper = styled.span`
  display: inline-block;
  cursor: pointer;
  padding: 0;
  color: ${sharedColors.LIGHT};

  svg {
    opacity: ${({ isOpen }) => (isOpen ? 1 : undefined)};
  }
`;

const SLinkedTopicsSpan = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  direction: rtl;
  max-width: 240px;
  margin-left: -5px;
`;

const FlashRowAnimation = makeFlashAnimation(
  css`
    background: transparent;
  `,
  css`
    background: ${sharedColors.HIGHLIGHT_MUTED};
  `
);

const AnimationDuration = 3;
const SAnimatedRow = styled.tr`
  background: transparent;
  animation: ${({ animate, skipAnimation }) => (animate && !skipAnimation ? FlashRowAnimation : "none")}
    ${AnimationDuration}s ease-in-out;
  animation-iteration-count: 1;
  animation-fill-mode: forwards;
  border-bottom: 1px solid ${sharedColors.BORDER_LIGHT};
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

function LinkedGlobalVariableRow({ name }: { name: string }): Node {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const { globalVariables, setGlobalVariables } = useGlobalVariables();
  const { linkedGlobalVariables, setLinkedGlobalVariables } = useLinkedGlobalVariables();

  const linkedTopicPaths = useMemo(
    () =>
      linkedGlobalVariables
        .filter((variable) => variable.name === name)
        .map(({ topic, markerKeyPath }) => [topic, ...markerKeyPath].join(".")),
    [linkedGlobalVariables, name]
  );

  const unlink = useCallback((path) => {
    setLinkedGlobalVariables(
      linkedGlobalVariables.filter(
        ({ name: varName, topic, markerKeyPath }) => !(varName === name && [topic, ...markerKeyPath].join(".") === path)
      )
    );
  }, [linkedGlobalVariables, name, setLinkedGlobalVariables]);

  const unlinkAndDelete = useCallback(() => {
    const newLinkedGlobalVariables = linkedGlobalVariables.filter(({ name: varName }) => varName !== name);
    setLinkedGlobalVariables(newLinkedGlobalVariables);
    setGlobalVariables({ [name]: undefined });
  }, [linkedGlobalVariables, name, setGlobalVariables, setLinkedGlobalVariables]);

  return (
    <>
      <td>${name}</td>
      <td width="100%">
        <JSONInput
          value={JSON.stringify(globalVariables[name] ?? "")}
          onChange={(newVal) => setGlobalVariables({ [name]: newVal })}
        />
      </td>
      <td>
        <Flex center style={{ justifyContent: "space-between" }}>
          <Flex style={{ marginRight: 16 }}>
            {linkedTopicPaths.length > 1 && <span>({linkedTopicPaths.length})</span>}

            <Tooltip
              contents={
                linkedTopicPaths.length ? (
                  <>
                    <div style={{ fontWeight: "bold", opacity: 0.4 }}>
                      {linkedTopicPaths.length} LINKED TOPIC{linkedTopicPaths.length > 1 ? "S" : ""}
                    </div>
                    {linkedTopicPaths.map((path) => (
                      <div key={path} style={{ paddingTop: "5px" }}>
                        {path}
                      </div>
                    ))}
                  </>
                ) : null
              }>
              <SLinkedTopicsSpan>
                {linkedTopicPaths.length ? <bdi>{linkedTopicPaths.join(", ")}</bdi> : "--"}
              </SLinkedTopicsSpan>
            </Tooltip>
          </Flex>
          <ChildToggle isOpen={isOpen} onToggle={() => setIsOpen(!isOpen)} position="below">
            <SIconWrapper isOpen={isOpen}>
              <Icon small dataTest={`unlink-${name}`}>
                <DotsVerticalIcon />
              </Icon>
            </SIconWrapper>
            <Menu style={{ padding: "4px 0px" }}>
              {linkedTopicPaths.map((path) => (
                <Item dataTest="unlink-path" key={path} onClick={() => unlink(path)}>
                  Remove <span style={{ color: sharedColors.LIGHT, opacity: 1 }}>{path}</span>
                </Item>
              ))}
              <Item onClick={unlinkAndDelete}>Delete global variable</Item>
            </Menu>
          </ChildToggle>
        </Flex>
      </td>
    </>
  );
}

function GlobalVariablesTable(): Node {
  const { globalVariables, setGlobalVariables, overwriteGlobalVariables } = useGlobalVariables();
  const { linkedGlobalVariables } = useLinkedGlobalVariables();
  const globalVariableNames = Object.keys(globalVariables);
  const linkedGlobalVariablesKeyByName = memoizedGetLinkedGlobalVariablesKeyByName(linkedGlobalVariables);
  const [linked, unlinked] = partition(globalVariableNames, (name) => !!linkedGlobalVariablesKeyByName[name]);

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
  useEffect(() => {
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
  }, [globalVariables, skipAnimation]);

  return (
    <SGlobalVariablesTable>
      <table>
        <thead>
          <tr>
            <th>Global variable</th>
            <th>Value</th>
            <th>Topic(s)</th>
          </tr>
        </thead>
        <tbody>
          {linked.map((name, idx) => (
            <SAnimatedRow
              key={`linked-${idx}`}
              skipAnimation={skipAnimation.current}
              animate={changedVariables.includes(name)}>
              <LinkedGlobalVariableRow name={name} changedVariables={changedVariables} />
            </SAnimatedRow>
          ))}
          {unlinked.map((name, idx) => (
            <SAnimatedRow
              key={`unlinked-${idx}`}
              skipAnimation={skipAnimation}
              animate={changedVariables.includes(name)}>
              <td data-test="global-variable-key">
                <ValidatedResizingInput
                  value={name}
                  dataTest={`global-variable-key-input-${name}`}
                  onChange={(newKey) =>
                    changeGlobalKey(newKey, name, globalVariables, linked.length + idx, overwriteGlobalVariables)
                  }
                  invalidInputs={without(globalVariableNames, name).concat("")}
                />
              </td>
              <td width="100%">
                <JSONInput
                  dataTest={`global-variable-value-input-${JSON.stringify(globalVariables[name] ?? "")}`}
                  value={JSON.stringify(globalVariables[name] ?? "")}
                  onChange={(newVal) => setGlobalVariables({ [name]: newVal })}
                />
              </td>
              <td width="100%">
                <Flex center style={{ justifyContent: "space-between" }}>
                  --
                  <SIconWrapper onClick={() => setGlobalVariables({ [name]: undefined })}>
                    <Icon small>
                      <CloseIcon />
                    </Icon>
                  </SIconWrapper>
                </Flex>
              </td>
            </SAnimatedRow>
          ))}
        </tbody>
      </table>
      <Flex style={{ margin: "20px 16px 16px", justifyContent: "flex-end" }}>
        <button
          disabled={globalVariables[""] != null}
          onClick={() => setGlobalVariables({ "": "" })}
          data-test="add-variable-btn">
          Add variable
        </button>
      </Flex>
    </SGlobalVariablesTable>
  );
}

export default GlobalVariablesTable;
