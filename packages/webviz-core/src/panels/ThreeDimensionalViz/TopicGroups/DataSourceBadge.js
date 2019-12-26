// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";
import styled from "styled-components";
import tinycolor from "tinycolor2";

import { colors } from "webviz-core/src/util/colors";

const BADGE_STYLES = {
  AVAILABLE_VISIBLE: {
    backgroundColor: colors.GRAY,
    color: colors.LIGHT,
  },
  AVAILABLE_HIDDEN: {
    backgroundColor: tinycolor(colors.GRAY)
      .darken(20)
      .toString(),
    color: tinycolor(colors.LIGHT)
      .darken(20)
      .toString(),
  },
};

const SDataSourceBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: ${(props) => (props.isNamespace ? "9px" : "12px")};
  border-radius: ${(props) => (props.isNamespace ? "9px" : "12px")};
  width: ${(props) => (props.isNamespace ? "18px" : "24px")};
  height: ${(props) => (props.isNamespace ? "18px" : "24px")};
  margin-left: 4px;
  color: ${colors.LIGHT};
`;

type Props = {| isNamespace?: boolean, badgeText: string, visible: boolean, available: boolean |};

// Apply different UI for topic and namespace badges based on visibility and availability
// TODO(Audrey): derive colors from settings and marker colors, apply hover UI
function getBadgeStyle(visible: boolean, available: boolean): { [attr: string]: string | number } {
  if (available) {
    return visible ? BADGE_STYLES.AVAILABLE_VISIBLE : BADGE_STYLES.AVAILABLE_HIDDEN;
  }
  // hide any unavailable items
  return { opacity: 0 };
}

export default function DataSourceBadge({ isNamespace, badgeText, visible, available }: Props) {
  return (
    <SDataSourceBadge isNamespace={isNamespace} style={getBadgeStyle(visible, available)}>
      {badgeText}
    </SDataSourceBadge>
  );
}
