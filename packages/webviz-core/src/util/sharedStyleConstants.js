// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import globalColors from "webviz-core/src/styles/colors.js";

export const colors = globalColors;

export const textSize = {
  SMALL: "12px",
  NORMAL: "14px",
  LARGE: "16px",
  H5: "20px",
  H4: "24px",
  H3: "32px",
  H2: "48px",
  H1: "64px",
};

export const rounded = {
  SMALL: "2px",
  NORMAL: "4px",
  LARGE: "8px",
  PILL: "999px",
  CIRCLE: "50%",
};

export const ROBOTO_MONO = "Roboto Mono";

export const jsonTreeTheme = {
  base00: "transparent", // bg
  base07: colors.BLUEL1, // text
  base0B: colors.YELLOW1, // string & date, item string
  base09: colors.REDL1, // # & boolean
  base08: colors.RED, // null, undefined, function, & symbol
  base0D: colors.BLUEL1, // label & arrow
  base03: colors.DARK9, // item string expanded
};
