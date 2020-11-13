// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { isEqual } from "lodash";
import * as React from "react";
import styled from "styled-components";

import { getPath, memoizedGetLinkedGlobalVariablesKeyByName } from "../interactionUtils";
import useLinkedGlobalVariables, { type LinkedGlobalVariable } from "../useLinkedGlobalVariables";
import { SGlobalVariableLink, SPath, GlobalVariableName } from "./index";
import UnlinkWrapper from "./UnlinkWrapper";
import Button from "webviz-core/src/components/Button";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

const SForm = styled.form`
  background-color: ${colors.DARK3};
  margin-left: 8px;
  width: 320px;
  box-shadow: 0 6px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 0, 0, 0.25);
  pointer-events: auto;
  flex: 0 0 auto;
  border-radius: 8px;
  overflow: hidden;
`;

const SExistingLinks = styled.div`
  margin-bottom: 8px;
`;

const SList = styled.ul`
  margin: 12px 6px;
`;

const SListItem = styled.li`
  display: flex;
  align-items: center;
  margin: 6px;
  width: 100%;
  overflow: hidden;
`;

const STopicWithPath = styled.span`
  margin-left: 12px;
  margin-right: 12px;
  flex: 1 1 0;
  overflow-wrap: break-word;
  overflow: hidden;
`;

type Props = {
  name: string,
  showList?: boolean,
};

export default function UnlinkGlobalVariables({ name, showList }: Props) {
  const { linkedGlobalVariables, setLinkedGlobalVariables } = useLinkedGlobalVariables();
  const linkedGlobalVariablesKeyByName = memoizedGetLinkedGlobalVariablesKeyByName(linkedGlobalVariables);
  const links: LinkedGlobalVariable[] = linkedGlobalVariablesKeyByName[name] || [];

  if (links.length === 0) {
    return null;
  }

  const listStyle = showList ? { marginLeft: 0, marginRight: 0 } : {};

  // the list UI is shared between 3D panel and Global Variables panel
  const listHtml = (
    <SList style={listStyle}>
      {links.map(({ topic, markerKeyPath, name: linkedGlobalVariableName }, idx) => {
        return (
          <SListItem key={idx} style={listStyle}>
            <Button
              danger
              small
              style={{ flexShrink: 0 }}
              onClick={() => {
                const newLinkedGlobalVariables = linkedGlobalVariables.filter(
                  (linkedGlobalVariable) =>
                    !(
                      linkedGlobalVariable.topic === topic &&
                      isEqual(linkedGlobalVariable.markerKeyPath, markerKeyPath) &&
                      linkedGlobalVariable.name === linkedGlobalVariableName
                    )
                );
                setLinkedGlobalVariables(newLinkedGlobalVariables);
              }}>
              Unlink
            </Button>
            <STopicWithPath>
              {topic}.<SPath>{getPath(markerKeyPath)}</SPath>
            </STopicWithPath>
          </SListItem>
        );
      })}
    </SList>
  );
  if (showList) {
    return (
      <SExistingLinks>
        <p style={{ marginTop: 0, lineHeight: "1.4" }}>
          Some links already exist for this variable. The variable’s value will be taken from the most recently clicked
          linked topic.
        </p>
        {listHtml}
      </SExistingLinks>
    );
  }

  return (
    <SGlobalVariableLink>
      <UnlinkWrapper
        tooltip={
          <span>
            Unlink <GlobalVariableName name={name} />
          </span>
        }
        linkedGlobalVariable={links[0]}>
        {() => <SForm data-test="unlink-form">{listHtml}</SForm>}
      </UnlinkWrapper>
    </SGlobalVariableLink>
  );
}
