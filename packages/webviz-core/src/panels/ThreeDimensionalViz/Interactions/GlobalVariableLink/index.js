// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";
import styled from "styled-components";

import GlobalVariableName from "../GlobalVariableName";
import { getLinkedGlobalVariable } from "../interactionUtils";
import useLinkedGlobalVariables, { type LinkedGlobalVariable } from "../useLinkedGlobalVariables";
import LinkToGlobalVariable from "./LinkToGlobalVariable";
import UnlinkGlobalVariable from "./UnlinkGlobalVariable";
import UnlinkGlobalVariables from "./UnlinkGlobalVariables";
import UnlinkWrapper from "./UnlinkWrapper";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

const SWrapper = styled.span`
  display: inline-flex;
  align-items: center;
`;
export const SPath = styled.span`
  opacity: 0.8;
`;
export const SP = styled.p`
  line-height: 1.4;
  margin-bottom: 12px;
`;
export const SGlobalVariableLink = styled.span`
  height: 15px;
  flex-direction: row;
  display: inline-flex;
  align-items: center;
  word-break: normal;
  .icon {
    color: ${colors.BLUE};
  }
  .link-icon {
    opacity: 0.2;
    display: inline;
  }
  .highlight {
    opacity: 1;
  }
  &:hover {
    .link-icon {
      opacity: 1;
    }
  }
`;

export const SGlobalVariableForm = styled.form`
  background-color: ${colors.DARK3};
  margin-left: -16px;
  padding: 12px;
  width: 240px;
  box-shadow: 0 6px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 0, 0, 0.25);
  pointer-events: auto;
  flex: 0 0 auto;
  border-radius: 8px;
  overflow-wrap: break-word;
`;

const SValue = styled.span`
  padding: 0;
`;

type Props = {
  addLinkTooltip?: React.Node,
  hasNestedValue?: boolean,
  highlight?: boolean,
  label?: string,
  linkedGlobalVariable?: ?LinkedGlobalVariable,
  markerKeyPath?: string[],
  nestedValueStyle?: any,
  onlyRenderAddLink?: boolean,
  style?: any,
  topic?: string,
  unlinkTooltip?: React.Node,
  variableValue?: any,
};

export default function GlobalVariableLink({
  addLinkTooltip,
  hasNestedValue,
  highlight,
  label,
  linkedGlobalVariable,
  markerKeyPath,
  nestedValueStyle = { marginLeft: 8 },
  onlyRenderAddLink,
  style = { marginLeft: 4 },
  topic,
  unlinkTooltip,
  variableValue = null,
}: Props) {
  const { linkedGlobalVariables } = useLinkedGlobalVariables();
  let linkedGlobalVariableLocal: ?LinkedGlobalVariable = linkedGlobalVariable;
  if (!linkedGlobalVariableLocal && topic && markerKeyPath) {
    linkedGlobalVariableLocal = getLinkedGlobalVariable({
      topic,
      markerKeyPath,
      linkedGlobalVariables,
    });
  }

  const isArrayBuffer = ArrayBuffer.isView(variableValue);
  const renderUnlink = !!linkedGlobalVariableLocal;
  const addToLinkedGlobalVariable = topic && markerKeyPath ? { topic, markerKeyPath, variableValue } : null;
  const renderAddLink = !renderUnlink && !isArrayBuffer && addToLinkedGlobalVariable;
  if (!(renderUnlink || renderAddLink)) {
    return null;
  }

  const arrayBufferStyle = isArrayBuffer ? style : { cursor: "pointer" };
  let wrapperStyle = hasNestedValue ? nestedValueStyle : style;
  wrapperStyle = { ...arrayBufferStyle, ...wrapperStyle };

  return (
    <SWrapper>
      {label && <SValue>{label}</SValue>}
      <SGlobalVariableLink style={wrapperStyle}>
        {linkedGlobalVariableLocal && !onlyRenderAddLink && (
          <UnlinkWrapper
            linkedGlobalVariable={linkedGlobalVariableLocal}
            name={linkedGlobalVariableLocal.name}
            tooltip={unlinkTooltip}>
            {({ setIsOpen, linkedGlobalVariable: linkedVar }) => (
              <UnlinkGlobalVariable linkedGlobalVariable={linkedVar} setIsOpen={setIsOpen} />
            )}
          </UnlinkWrapper>
        )}
        {renderAddLink && addToLinkedGlobalVariable && (
          <LinkToGlobalVariable
            highlight={highlight}
            tooltip={addLinkTooltip}
            addToLinkedGlobalVariable={addToLinkedGlobalVariable}
          />
        )}
      </SGlobalVariableLink>
    </SWrapper>
  );
}

export { GlobalVariableName, UnlinkGlobalVariables };
