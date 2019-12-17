// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { memoize } from "lodash";
import tinycolor from "tinycolor2";

import { toolsColorScheme } from "webviz-core/src/util/toolsColorScheme";

// Inspired by the "light" scheme from https://personal.sron.nl/~pault/#sec:qualitative
// but using our standard tools colors.
export const lineColors = [
  toolsColorScheme.blue.medium,
  toolsColorScheme.orange.medium,
  toolsColorScheme.yellow.medium,
  toolsColorScheme.purple.dark,
  toolsColorScheme.cyan.medium,
  toolsColorScheme.green.medium,
  toolsColorScheme.paleGreen.medium,
  "#DDDDDD",
];

export const lightColor: (_: string) => string = memoize(
  (color: string): string =>
    tinycolor(color)
      .brighten(15)
      .toString()
);

export const darkColor: (_: string) => string = memoize(
  (color: string): string =>
    tinycolor(color)
      .darken(30)
      .toString()
);
