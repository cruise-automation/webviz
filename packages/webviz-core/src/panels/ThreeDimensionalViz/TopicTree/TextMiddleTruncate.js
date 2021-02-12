// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";
import styled from "styled-components";

import Tooltip from "webviz-core/src/components/Tooltip";

export const DEFAULT_END_TEXT_LENGTH = 16;

export const STextMiddleTruncate = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: flex-start;
`;

const SStart = styled.div`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 1;
`;

const SEnd = styled.div`
  white-space: nowrap;
  flex-basis: content;
  flex-grow: 0;
  flex-shrink: 0;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

type Props = {|
  tooltips?: React.Node[],
  text: string,
  endTextLength?: number,
  style?: { [attr: string]: string | number },
  testShowTooltip?: boolean,
|};

export default function TextMiddleTruncate({ tooltips, text, endTextLength, style, testShowTooltip }: Props) {
  const startTextLen = Math.max(0, text.length - (endTextLength || DEFAULT_END_TEXT_LENGTH));
  const startText = text.substr(0, startTextLen);
  const endText = text.substr(startTextLen);

  const elem = (
    <STextMiddleTruncate style={style}>
      <SStart>{startText}</SStart>
      <SEnd>{endText}</SEnd>
    </STextMiddleTruncate>
  );
  return tooltips ? (
    <Tooltip contents={tooltips} placement="top" defaultShown={testShowTooltip}>
      {elem}
    </Tooltip>
  ) : (
    elem
  );
}
