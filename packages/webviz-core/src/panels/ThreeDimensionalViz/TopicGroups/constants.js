// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

export const DEFAULT_IMPORTED_GROUP_NAME = "Imported Group";
export const DEFAULT_DEBOUNCE_TIME = 50;

export const DATA_SOURCE_BADGE_SIZE = 28;
export const ICON_PADDING = 2;
export const ICON_SIZE = 18; // default small icon size
export const ICON_TOTAL_SIZE = ICON_PADDING * 2 + ICON_SIZE;

export const ITEM_MAIN_PADDING_LEFT = ICON_TOTAL_SIZE * 4 + 12;

export const KEYBOARD_SHORTCUTS = [
  {
    description: "Toggle topic panel",
    keys: ["T"],
  },
  {
    description: "Search",
    keys: ["/"],
  },
  {
    description: "Navigate up/down",
    keys: ["↑", "↓"],
  },
  {
    description: "Expand/collapse",
    keys: ["←", "→"],
  },
  {
    description: "Toggle group/topic visibility",
    keys: ["Enter"],
  },
  {
    description: "Toggle children",
    keys: ["Shift", "Enter"],
  },
  {
    description: "Remove focus",
    keys: ["Esc"],
  },
];

export const KEYBOARD_FOCUS_TYPES = {
  GROUP: "GROUP",
  NEW_GROUP: "NEW_GROUP",
  TOPIC: "TOPIC",
  NEW_TOPIC: "NEW_TOPIC",
  NAMESPACE: "NAMESPACE",
};

export const FOCUS_ITEM_OPS = {
  Enter: "Enter",
  ArrowLeft: "ArrowLeft",
  ArrowRight: "ArrowRight",
  ArrowUp: "ArrowUp",
  ArrowDown: "ArrowDown",
  Backspace: "Backspace", // non-filter mode only
};

export const OTHER_KEY_OPS = { t: "t", Escape: "Escape", "/": "/" };
