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
import TextMiddleTruncate from "./TextMiddleTruncate";
import Tooltip from "webviz-core/src/components/Tooltip";
import { SECOND_SOURCE_PREFIX } from "webviz-core/src/util/globalConstants";

// Extra text length to make sure text such as `1000 visible topics` don't get truncated.
const DEFAULT_END_TEXT_LENGTH = 22;

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
const SWrapper = styled.div`
  display: flex;
  align-items: center;
`;

type Props = {|
  // Additional element to show in non xs view when not searching. Currently only used for showing visible topic count.
  additionalElem?: React.Node,
  displayName: string,
  isXSWidth: boolean,
  maxWidth: number,
  topicName: string,
  searchText?: string,
  style?: { [attr: string]: string | number },
  tooltips?: React.Node[],
|};

export default function NodeName({
  additionalElem,
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
    let topicNameToShow = topicName;
    const prefixedTopicName = `${SECOND_SOURCE_PREFIX}${topicName}`;

    // Show feature topic if base topicName does not include searchText and it's still a match.
    if (topicName && !topicName.includes(searchText) && prefixedTopicName.includes(searchText)) {
      topicNameToShow = prefixedTopicName;
      targetStr = topicNameToShow;
    }

    if (displayName && topicName && displayName !== topicName) {
      targetStr = `${displayName} (${topicNameToShow})`;
    }
  }
  const xsWidthElem =
    isXSWidth &&
    (tooltips ? (
      <Tooltip contents={tooltips} placement="top">
        <SName>{targetStr}</SName>
      </Tooltip>
    ) : (
      <SName>{targetStr}</SName>
    ));

  const textTruncateElem = (
    <TextMiddleTruncate
      text={targetStr}
      endTextLength={topicName ? topicName.split("/").pop().length + 1 : DEFAULT_END_TEXT_LENGTH}
      tooltips={tooltips}
    />
  );
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
              <>
                {additionalElem ? (
                  <SWrapper style={{ width: maxWidth }}>
                    {textTruncateElem}
                    {additionalElem}
                  </SWrapper>
                ) : (
                  textTruncateElem
                )}
              </>
            )}
          </>
        )}
      </SDisplayName>
    </STopicNameDisplay>
  );
}
