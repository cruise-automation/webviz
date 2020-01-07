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

const SDisplayName = styled.div`
  font-size: 14px;
  line-height: 1.2;
  margin-bottom: 4px;
  word-break: break-word;
`;

const STopicName = styled.div`
  font-size: 10px;
  line-height: 1.2;
  word-break: break-word;
  opacity: 0.8;
`;

type Props = {|
  displayName: string,
  topicName: string,
  searchText?: string,
|};

export default function TopicNameDisplay({ displayName, topicName, searchText }: Props) {
  return (
    <>
      <SDisplayName>
        <TextHighlight targetStr={displayName} searchText={searchText} />
      </SDisplayName>
      {displayName !== topicName && (
        <STopicName>
          <TextHighlight targetStr={topicName} searchText={searchText} />
        </STopicName>
      )}
    </>
  );
}
