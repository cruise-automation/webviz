// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import LinkPlusIcon from "@mdi/svg/svg/link-plus.svg";
import * as React from "react";
import styled from "styled-components";

import GlobalVariableLink, { SPath, GlobalVariableName } from "./GlobalVariableLink/index";
import { SEmptyState } from "./index";
import { getPath } from "./interactionUtils";
import { type LinkedGlobalVariables } from "./useLinkedGlobalVariables";
import Icon from "webviz-core/src/components/Icon";

const STable = styled.table`
  td {
    padding: 0.3em;
    border: none;
    vertical-align: middle;
  }
`;

type Props = {
  linkedGlobalVariables: LinkedGlobalVariables,
};

export default function LinkedGlobalVariableList({ linkedGlobalVariables }: Props) {
  if (linkedGlobalVariables.length === 0) {
    return (
      <SEmptyState>
        Click the{" "}
        <Icon style={{ display: "inline", verticalAlign: "middle", lineHeight: 1 }} clickable={false}>
          <LinkPlusIcon />
        </Icon>{" "}
        icon in the “Clicked object” tab to link values with global variables.
      </SEmptyState>
    );
  }
  return (
    <>
      <SEmptyState>Clicking on objects from these topics will update the linked global variables.</SEmptyState>
      <STable>
        <tbody>
          {linkedGlobalVariables.map((linkedGlobalVariable, index) => (
            <tr key={index}>
              <td>
                <GlobalVariableLink
                  linkedGlobalVariable={linkedGlobalVariable}
                  unlinkTooltip={
                    <span>
                      Unlink <GlobalVariableName name={linkedGlobalVariable.name} />
                    </span>
                  }
                />
              </td>
              <td style={{ wordBreak: "break-all" }}>
                {linkedGlobalVariable.topic}.<SPath>{getPath(linkedGlobalVariable.markerKeyPath)}</SPath>
              </td>
            </tr>
          ))}
        </tbody>
      </STable>
    </>
  );
}
