// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import tinyColor from "tinycolor2";

const baseColors = {
  DARK: "#08080a",
  DARK1: "#111114",
  DARK2: "#1a1a1f",
  DARK3: "#242429",
  DARK4: "#2d2d33",
  DARK5: "#36363d",
  DARK6: "#404047",
  DARK7: "#4b4b52",
  DARK8: "#55555c",
  DARK9: "#606066",

  LIGHT: "#ffffff",
  LIGHT1: "#f0f0f0",
  LIGHT2: "#cacacc",

  GRAY: "#9f9fa2",
  GRAY2: "#2d2c33",

  MAGENTAL1: "#e05ffa",
  MAGENTA: "#c83deb",
  MAGENTA1: "#b024d6",

  PURPLEL1: "#9987ff",
  PURPLE: "#7c6bff",
  PURPLE1: "#6858f5",

  BLUEL1: "#45a5ff",
  BLUE: "#248eff",
  BLUE1: "#0f71f2",

  TEALL1: "#2abed1",
  TEAL: "#00a8c2",
  TEAL1: "#0090ad",

  GREENL1: "#1abd89",
  GREEN: "#00a375",
  GREEN1: "#008768",

  LIMEL1: "#6bd66f",
  LIME: "#4ac252",
  LIME1: "#31ad49",

  YELLOWL1: "#f5d358",
  YELLOW: "#f7be00",
  YELLOW1: "#eba800",

  ORANGEL1: "#fc8942",
  ORANGE: "#f76c1b",
  ORANGE1: "#e5540b",

  REDL1: "#ff6b82",
  RED: "#f54966",
  RED1: "#db3553",
  RED2: "#ff7c96",
};

export const colors = {
  ...baseColors,
  PRIMARY: baseColors.PURPLE,
  TEXT_MUTED: baseColors.GRAY,
  HIGHLIGHT: baseColors.BLUE,
  // TODO:(Audrey): !!! need design review. Don't use these colors until TopicGrouping feature is finished.
  HOVER_BACKGROUND_COLOR: tinyColor(baseColors.PURPLE)
    .setAlpha(0.2)
    .toRgbString(),

  DISABLED: baseColors.DARK9,
  TEXTL1: baseColors.LIGHT2,
  ACTION: baseColors.BLUE,
  TEXT: baseColors.LIGHT1,
  TOOLBAR: baseColors.DARK2,
  TOOLBARL1: baseColors.DARK4,
  BRIGHT_YELLOW: "#f6ff00",
};

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
