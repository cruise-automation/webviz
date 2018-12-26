//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// basic palette colors
const baseColors = [
  { label: "dark", value: "#1f1e27" },
  { label: "white", value: "#ffffff" },
  { label: "gray", value: "#88878a" },
  { label: "taupe", value: "#f7f7f3" },
  { label: "red", value: "#f24366" },
  { label: "red1", value: "#ff7c96" },
  { label: "red2", value: "#ffaabb" },
  { label: "blue", value: "#1b83ec" },
  { label: "blue1", value: "#4e98e2" },
  { label: "blue2", value: "#77aadd" },
  { label: "paleGreen", value: "#b4cc00" },
  { label: "paleGreen1", value: "#cad660" },
  { label: "paleGreen2", value: "#cdd67e" },
  { label: "orange", value: "#ea531f" },
  { label: "orange1", value: "#f5774d" },
  { label: "orange2", value: "#faa487" },
  { label: "cyan", value: "#22b5ff" },
  { label: "cyan1", value: "#61cbff" },
  { label: "cyan2", value: "#99ddff" },
  { label: "green", value: "#05d27d" },
  { label: "green1", value: "#5cd6a9" },
  { label: "green2", value: "#8de0c9" },
  { label: "purple", value: "#6e51ee" },
  { label: "purple1", value: "#a395e2" },
  { label: "purple2", value: "#c7c0e7" },
  { label: "yellow", value: "#edcc28" },
  { label: "yellow1", value: "#f7df71" },
  { label: "yellow2", value: "#f1e4a9" },
];

const opacities = [
  { value: 90, hex: "E6" },
  { value: 80, hex: "CC" },
  { value: 70, hex: "B3" },
  { value: 60, hex: "99" },
  { value: 50, hex: "80" },
  { value: 40, hex: "66" },
  { value: 30, hex: "4D" },
  { value: 20, hex: "33" },
  { value: 10, hex: "1A" },
  { value: 5, hex: "0D" },
];

const palette = {};

// generate palette colors with opacities
baseColors.forEach((color) => {
  palette[color.label] = color.value;
  opacities.forEach((opacity) => {
    palette[`${color.label}${opacity.value}`] = `${color.value}${opacity.hex}`;
  });
});

const darkThemeColors = {
  // general
  primary: palette.yellow,
  secondary: palette.cyan,
  icon: palette.white,
  disabled: palette.taupe,
  hover: palette.yellow,
  label: palette.yellow,
  bgDark: palette.dark,

  // text
  textBody: palette.white,
  textLight: palette.taupe,
  textMuted: palette.gray,
  linkPrimary: palette.yellow,
  linkPrimaryVisited: palette.yellow,
  linkSecondaryActive: palette.purple1,

  // status
  success: palette.green,
  warning: palette.orange,
  danger: palette.red,
  info: palette.bue,
};

const fontFamily = {
  primary: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace',
};

// keeping `px` for now so we could easily switch to rem later, if needed
const fontSize = {
  "12": "12px",
  "14": "14px",
  "16": "16px",
  "20": "20px",
  "24": "24px",
  "32": "32px",
  "48": "48px",
  "64": "64px",
  "128": "128px",
  h1: "38px",
  h1Sm: "32px", // h1 on small and medium sized screens
  h2: "20px",
  h3: "18px",
  body: "16px",
};

const fontWeight = { "300": 300, "400": 400, "500": 500 };
const spacing = {
  "0": 0,
  "4": "4px",
  "8": "8px",
  "16": "16px",
  "32": "32px",
  "48": "48px",
  "64": "64px",
  "128": "128px",
  "256": "256px",
  "512": "512px",
};

const color = darkThemeColors;

export { palette, color, fontFamily, fontSize, fontWeight, spacing };

export default {
  palette,
  color,
  fontFamily,
  fontSize,
  fontWeight,
  spacing,
};
