// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import React from "react";
import styled from "styled-components";

import { diffLabels, diffArrow } from "webviz-core/src/panels/RawMessages/getDiff";

export const SDiffSpan = styled.span`
  padding: 0px 4px;
  text-decoration: inherit;
`;

export function HighlightedValue({ itemLabel, keyPath }: { itemLabel: string, keyPath: Array<string | number> }) {
  // react-json-tree's valueRenderer only gets called for primitives, so diff before/after values must be at same level by the time it gets to the tree
  const splitItemLabel = `${itemLabel}`.split(` ${diffArrow} `);
  const itemLabelContainsChange = splitItemLabel.length === 2;
  if (itemLabelContainsChange) {
    const [before, after] = splitItemLabel;
    const beforeText = JSON.parse(JSON.stringify(before));
    const afterText = JSON.parse(JSON.stringify(after));
    return (
      <SDiffSpan style={{ color: diffLabels.CHANGED.color }}>{`${beforeText} ${diffArrow} ${afterText}`}</SDiffSpan>
    );
  }
  return <SDiffSpan>{itemLabel}</SDiffSpan>;
}
