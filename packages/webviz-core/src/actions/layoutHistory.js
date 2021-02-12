// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

export type REDO_LAYOUT_CHANGE = { type: "REDO_LAYOUT_CHANGE" };

export const redoLayoutChange = (): REDO_LAYOUT_CHANGE => ({
  type: "REDO_LAYOUT_CHANGE",
});

export type UNDO_LAYOUT_CHANGE = { type: "UNDO_LAYOUT_CHANGE" };

export const undoLayoutChange = (): UNDO_LAYOUT_CHANGE => ({
  type: "UNDO_LAYOUT_CHANGE",
});

export type LayoutHistoryActions = REDO_LAYOUT_CHANGE | UNDO_LAYOUT_CHANGE;
