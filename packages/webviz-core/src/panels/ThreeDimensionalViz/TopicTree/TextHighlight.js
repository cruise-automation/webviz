// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";
import Highlighter from "react-highlight-words";
import styled from "styled-components";

import { colors } from "webviz-core/src/util/sharedStyleConstants";

const HIGHLIGHT_CLASSNAME = "rc-TextHighlight-highlight";
const STextHighlight = styled.span`
  .${HIGHLIGHT_CLASSNAME} {
    color: ${colors.BLUE};
    background: none;
    padding: 0;
  }
`;

type Props = {|
  targetStr: string,
  searchText?: string,
|};

export default function TextHighlight({ targetStr = "", searchText = "" }: Props) {
  if (!searchText) {
    return targetStr;
  }

  return (
    <STextHighlight>
      <Highlighter
        autoEscape
        highlightClassName={HIGHLIGHT_CLASSNAME}
        searchWords={[searchText]}
        textToHighlight={targetStr}
      />
    </STextHighlight>
  );
}
