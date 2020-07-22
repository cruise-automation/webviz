// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useCallback, useState } from "react";
import styled from "styled-components";

import Tooltip from "webviz-core/src/components/Tooltip";
import { diffLabels, diffArrow } from "webviz-core/src/panels/RawMessages/getDiff";

// Strings longer than this many characters will start off collapsed.
const COLLAPSE_TEXT_OVER_LENGTH = 1000;

export const SDiffSpan = styled.span`
  padding: 0px 4px;
  text-decoration: inherit;
`;

export function HighlightedValue({ itemLabel }: { itemLabel: string }) {
  const diffArrowStr = ` ${diffArrow} `;
  // react-json-tree's valueRenderer only gets called for primitives, so diff before/after values must be at same level by the time it gets to the tree
  const splitItemLabel = `${itemLabel}`.split(diffArrowStr);
  const itemLabelContainsChange = splitItemLabel.length === 2;
  if (itemLabelContainsChange) {
    const [before, after] = splitItemLabel;
    const beforeText = JSON.parse(JSON.stringify(before));
    const afterText = JSON.parse(JSON.stringify(after));
    return (
      <SDiffSpan style={{ color: diffLabels.CHANGED.color }}>
        <MaybeCollapsedValue itemLabel={beforeText} />
        {diffArrowStr}
        <MaybeCollapsedValue itemLabel={afterText} />
      </SDiffSpan>
    );
  }

  return (
    <SDiffSpan>
      <MaybeCollapsedValue itemLabel={itemLabel} />
    </SDiffSpan>
  );
}

function MaybeCollapsedValue({ itemLabel }: { itemLabel: string }) {
  const lengthOverLimit = itemLabel.length >= COLLAPSE_TEXT_OVER_LENGTH;
  const [showingEntireLabel, setShowingEntireLabel] = useState(!lengthOverLimit);
  const itemLabelToShow = showingEntireLabel ? itemLabel : itemLabel.slice(0, COLLAPSE_TEXT_OVER_LENGTH);
  const expandText = useCallback(() => setShowingEntireLabel(true), []);
  return (
    <Tooltip contents={!showingEntireLabel ? "Text was truncated, click to see all" : ""}>
      <span onClick={expandText} style={{ cursor: !showingEntireLabel ? "pointer" : "inherit" }}>
        {`${itemLabelToShow}${!showingEntireLabel ? "..." : ""}`}
      </span>
    </Tooltip>
  );
}
