// @flow
//
//  Copyright (c) 2021-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

const robotStylesColors = {
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

const customColors = {
  CYAN: "#00ffff",
  BRIGHT_YELLOW: "#f6ff00",
};

const semanticColors = {
  accent: robotStylesColors.BLUE,
  background: robotStylesColors.DARK1,
  highlight: robotStylesColors.BLUEL1,
  backgroundControl: "rgba(247, 247, 243, 0.1)",
  backgroundControlSelected: " rgba(59, 46, 118, 0.6)",

  textBright: "rgba(247, 247, 243, 0.88)",
  textNormal: "rgba(247, 247, 243, 0.77)",
  textDisabled: "rgba(247, 247, 243, 0.15)",
  textMuted: "rgba(247, 247, 243, 0.3)",
  textControl: "rgba(247, 247, 243, 0.77)",
  textControlHover: "rgba(247, 247, 243, 1)",
  textInputDisabled: "rgba(0, 0, 0, 0.3)",

  menuItemSelected: "rgba(45, 45, 51, 1)",
  divider: "rgba(247, 247, 243, 0.1)",

  PRIMARY: robotStylesColors.PURPLE,
  TEXT_MUTED: robotStylesColors.GRAY,
  HIGHLIGHT: robotStylesColors.BLUE,
  HIGHLIGHT_MUTED: "rgba(36, 142, 255, 0.3)",
  TEXTL1: robotStylesColors.LIGHT2,
  TEXT: robotStylesColors.LIGHT1,
  BORDER_LIGHT: "rgba(255, 255, 255, 0.1)",
  DIFF_MODE_SOURCE_1: robotStylesColors.MAGENTA,
  DIFF_MODE_SOURCE_2: robotStylesColors.TEAL,
  DIFF_MODE_SOURCE_BOTH: robotStylesColors.DARK7,
};

module.exports = {
  ...robotStylesColors,
  ...semanticColors,
  ...customColors,
};
