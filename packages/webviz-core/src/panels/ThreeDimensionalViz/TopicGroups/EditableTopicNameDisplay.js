// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useState, useRef } from "react";
import styled from "styled-components";

import TextHighlight from "./TextHighlight";
import { STopicNameDisplay, STopicName } from "./TopicNameDisplay";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

const SDisplayNameInput = styled.input`
  font-size: 13px;
  width: 235px;
  border-radius: 2px;
  padding: 0px;
  background-color: ${colors.DARK1};
  &:focus {
    background-color: ${colors.DARK1};
  }
`;

const SDisplayName = styled.div`
  font-size: 13px;
  line-height: 1.4;
  margin-right: 4px;
  word-break: break-word;
  margin-bottom: ${(props: { renderTopicName: boolean }) => (props.renderTopicName ? "0px" : "0px")};
  /* disallow selection to prevent shift + click from accidentally select */
  user-select: none;
  width: 100%;
  border-radius: 2px;
  &:hover {
    background-color: ${colors.DARK1};
  }
`;

type Props = {|
  displayName: string,
  onlyHighlightTopic?: boolean,
  topicName: string,
  searchText?: string,
  onClick?: () => void,
  onChangeDisplayName: (string) => void,
  isKeyboardFocused: ?boolean,
  style?: { [attr: string]: string | number },
|};

export default function EditableTopicNameDisplay({
  displayName,
  topicName,
  searchText,
  onClick,
  onChangeDisplayName,
  onlyHighlightTopic,
  style = {},
}: Props) {
  const [editableDisplayName, setEditableDisplayName] = useState(null);
  const displayNameInputRef = useRef(null);

  const renderTopicName = displayName !== topicName;

  return (
    <STopicNameDisplay
      style={{ ...style, cursor: onClick ? "pointer" : "unset" }}
      {...(onClick ? { onClick, ["data-test"]: `topic-name-${displayName}` } : undefined)}>
      <SDisplayName
        title={displayName}
        renderTopicName={renderTopicName}
        onClick={() => setEditableDisplayName(displayName)}
        data-test={`display-name-${displayName}`}>
        {editableDisplayName != null ? (
          <SDisplayNameInput
            value={editableDisplayName}
            onBlur={() => setEditableDisplayName(null)}
            onChange={(event) => setEditableDisplayName(event.target.value)}
            ref={displayNameInputRef}
            autoFocus
            onKeyPress={(event) => {
              if (event.key === "Enter") {
                onChangeDisplayName(editableDisplayName);
                setEditableDisplayName(null);
              }
            }}
            data-test="edit-name-input"
          />
        ) : (
          <TextHighlight targetStr={displayName} searchText={onlyHighlightTopic ? undefined : searchText} />
        )}
      </SDisplayName>
      {renderTopicName && (
        <STopicName>
          <TextHighlight targetStr={topicName} searchText={searchText} />
        </STopicName>
      )}
    </STopicNameDisplay>
  );
}
