// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { ActionTypes } from "webviz-core/src/actions";
import { panelEditingActions } from "webviz-core/src/actions/panels";
import { type PanelsState } from "webviz-core/src/reducers/panels";
import { pushState, redoChange, undoChange, type StateHistory } from "webviz-core/src/util/stateHistory";

const LAYOUT_HISTORY_SIZE = 20;

export type LayoutHistory = {|
  redoStates: PanelsState[],
  undoStates: PanelsState[],
|};

export const defaultLayoutHistory = (): LayoutHistory => ({
  undoStates: [],
  redoStates: [],
});

// Helper to encode the panels and layout history as a StateHistory object so we can do generic
// push, undo and redo operations.
const toStateHistory = (panels: PanelsState, layoutHistory: LayoutHistory): StateHistory<PanelsState> => {
  return { currentState: panels, redoStates: layoutHistory.redoStates, undoStates: layoutHistory.undoStates };
};

// Helper to decode a generic StateHistory object into panels and layoutHistory to store in redux.
const fromStateHistory = (
  stateHistory: StateHistory<PanelsState>
): { panels: PanelsState, layoutHistory: LayoutHistory } => {
  const { currentState, redoStates, undoStates } = stateHistory;
  return { panels: currentState, layoutHistory: { redoStates, undoStates } };
};

const redoLayoutChange = (
  panels: PanelsState,
  layoutHistory: LayoutHistory
): { panels: PanelsState, layoutHistory: LayoutHistory } => {
  return fromStateHistory(redoChange(toStateHistory(panels, layoutHistory)));
};

const undoLayoutChange = (
  panels: PanelsState,
  layoutHistory: LayoutHistory
): { panels: PanelsState, layoutHistory: LayoutHistory } => {
  return fromStateHistory(undoChange(toStateHistory(panels, layoutHistory)));
};

const pushLayoutChange = (
  oldPanels: ?PanelsState,
  newPanels: PanelsState,
  layoutHistory: LayoutHistory,
  action: any
): LayoutHistory => {
  if (oldPanels) {
    const { undoStates, redoStates } = pushState(
      toStateHistory(oldPanels, layoutHistory),
      newPanels,
      LAYOUT_HISTORY_SIZE
    );
    return { redoStates, undoStates };
  }
  return layoutHistory;
};

export default function(
  oldPanels: ?PanelsState,
  panels: PanelsState,
  layoutHistory: LayoutHistory = defaultLayoutHistory(),
  action: ActionTypes
): { panels: PanelsState, layoutHistory: LayoutHistory } {
  switch (action.type) {
    case "UNDO_LAYOUT_CHANGE":
      return undoLayoutChange(panels, layoutHistory);
    case "REDO_LAYOUT_CHANGE":
      return redoLayoutChange(panels, layoutHistory);
    default:
      if (panelEditingActions.has(action.type)) {
        return { panels, layoutHistory: pushLayoutChange(oldPanels, panels, layoutHistory, action) };
      }
      return { layoutHistory, panels };
  }
}
