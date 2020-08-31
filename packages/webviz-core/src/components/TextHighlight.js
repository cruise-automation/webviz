// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import fuzzySort from "fuzzysort";
import React from "react";
import styled from "styled-components";

import { colors } from "webviz-core/src/util/sharedStyleConstants";

const STextHighlight = styled.span`
  .TextHighlight-highlight {
    color: ${colors.PURPLE};
    font-weight: bold;
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
  const result = fuzzySort.highlight(
    fuzzySort.single(searchText, targetStr),
    "<span class='TextHighlight-highlight'>",
    "</span>"
  );
  // TODO(Audrey): compute highlighted parts separately in order to avoid dangerouslySetInnerHTML
  return <STextHighlight>{result ? <span dangerouslySetInnerHTML={{ __html: result }} /> : targetStr}</STextHighlight>;
}
