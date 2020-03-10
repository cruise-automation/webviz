// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";
import styled from "styled-components";

import TextHighlight from "./TextHighlight";

const STopicNameDisplay = styled.div`
  display: inline-block;
`;

const SDisplayName = styled.div`
  font-size: 13px;
  line-height: 1.4;
  margin-right: 4px;
  word-break: break-word;
  margin-bottom: ${(props: { renderTopicName: boolean }) => (props.renderTopicName ? "0px" : "0px")};
  /* disallow selection to prevent shift + click from accidentally select */
  user-select: none;
`;

const STopicName = styled.div`
  font-size: 10px;
  line-height: 1.2;
  word-break: break-word;
  opacity: 0.8;
  /* disallow selection to prevent shift + click from accidentally select */
  user-select: none;
`;

type Props = {|
  displayName: string,
  onlyHighlightTopic?: boolean,
  topicName: string,
  searchText?: string,
  onClick?: () => void,
  style?: { [attr: string]: string | number },
|};

export default function TopicNameDisplay({
  displayName,
  topicName,
  searchText,
  onClick,
  onlyHighlightTopic,
  style = {},
}: Props) {
  const renderTopicName = displayName !== topicName;
  return (
    <STopicNameDisplay
      style={{ ...style, cursor: onClick ? "pointer" : "unset" }}
      {...(onClick ? { onClick, ["data-test"]: `topic-name-${displayName}` } : undefined)}>
      <SDisplayName title={displayName} renderTopicName={renderTopicName}>
        <TextHighlight targetStr={displayName} searchText={onlyHighlightTopic ? undefined : searchText} />
      </SDisplayName>
      {renderTopicName && (
        <STopicName>
          <TextHighlight targetStr={topicName} searchText={searchText} />
        </STopicName>
      )}
    </STopicNameDisplay>
  );
}
