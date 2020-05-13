// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";
import styled from "styled-components";

import TextHighlight from "./TextHighlight";
import TextMiddleTruncate, { DEFAULT_END_TEXT_LENGTH } from "./TextMiddleTruncate";
import Tooltip from "webviz-core/src/components/Tooltip";

export const STopicNameDisplay = styled.div`
  display: inline-block;
`;

export const SDisplayName = styled.div`
  font-size: 13px;
  line-height: 1.4;
  margin-right: 4px;
  word-break: break-word;
  /* disallow selection to prevent shift + click from accidentally select */
  user-select: none;
  width: 100%;
`;

export const SName = styled.div`
  /* disallow selection to prevent shift + click from accidentally select */
  user-select: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

type Props = {|
  displayName: string,
  isXSWidth: boolean,
  maxWidth: number,
  topicName: string,
  searchText?: string,
  style?: { [attr: string]: string | number },
  tooltips?: React.Node[],
|};

export default function NodeName({
  displayName,
  isXSWidth,
  maxWidth,
  topicName,
  searchText,
  style = {},
  tooltips,
}: Props) {
  let targetStr = displayName || topicName;
  if (searchText) {
    if (displayName && topicName && displayName !== topicName) {
      targetStr = `${displayName} (${topicName})`;
    }
  }
  const xsWidthElem =
    isXSWidth &&
    (tooltips ? (
      <Tooltip contents={tooltips} placement="bottom">
        <SName>{targetStr}</SName>
      </Tooltip>
    ) : (
      <SName>{targetStr}</SName>
    ));

  return (
    <STopicNameDisplay style={style}>
      <SDisplayName style={{ maxWidth }}>
        {searchText ? (
          <TextHighlight targetStr={targetStr} searchText={searchText} />
        ) : (
          <>
            {isXSWidth ? (
              xsWidthElem
            ) : (
              <TextMiddleTruncate
                text={targetStr}
                endTextLength={topicName ? topicName.split("/").pop().length + 1 : DEFAULT_END_TEXT_LENGTH}
                tooltips={tooltips}
              />
            )}
          </>
        )}
      </SDisplayName>
    </STopicNameDisplay>
  );
}
