// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { isEqual } from "lodash";
import simpleDeepFreeze from "simple-deep-freeze";

import type { ActionTypes } from "webviz-core/src/actions";
import { panelEditingActions } from "webviz-core/src/actions/panels";
import type { State } from "webviz-core/src/reducers";
import { setStoredLayout, type PanelsState } from "webviz-core/src/reducers/panels";
import { type EditHistoryOptions } from "webviz-core/src/types/panels";
import { pushState, redoChange, undoChange, type StateHistory } from "webviz-core/src/util/stateHistory";

const LAYOUT_HISTORY_SIZE = 20;
// Threshold is a guess, and could be refined if it seems we're saving too few or too many entries
// in the undo/redo history.
export const NEVER_PUSH_LAYOUT_THRESHOLD_MS = 1000; // Exported for tests

export type LayoutHistory = {|
  redoStates: PanelsState[],
  undoStates: PanelsState[],
  // We want to avoid pushing too many states onto the undo history when actions are quickly
  // dispatched -- either automatically, or as the result of quick user interactions like typing or
  // continuous scrolls/drags. While actions continue uninterrupted, do not create "save points".
  lastTimestamp: number,
|};

export const initialLayoutHistoryState: LayoutHistory = simpleDeepFreeze({
  undoStates: [],
  redoStates: [],
  lastTimestamp: 0,
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
  return {
    panels: currentState,
    // After undo/redo, any subsequent layout action should result in the state being pushed onto
    // the undo history.
    layoutHistory: { ...initialLayoutHistoryState, redoStates, undoStates },
  };
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
  const time = Date.now();
  const historyOptions: ?EditHistoryOptions = action.payload?.historyOptions;
  if (historyOptions === "SUPPRESS_HISTORY_ENTRY" || isEqual(oldPanels, newPanels)) {
    return layoutHistory;
  }
  if (oldPanels && time - layoutHistory.lastTimestamp > NEVER_PUSH_LAYOUT_THRESHOLD_MS) {
    const { undoStates, redoStates } = pushState(
      toStateHistory(oldPanels, layoutHistory),
      newPanels,
      LAYOUT_HISTORY_SIZE
    );
    return { redoStates, undoStates, lastTimestamp: time };
  }
  // Don't need to push the old state onto the undo stack, because the previous action was quite
  // recent. Update the layoutHistory's lastTimestamp, though, so continuous actions can be
  // debounced forever.
  return { ...layoutHistory, lastTimestamp: time };
};

export default function(state: State, action: ActionTypes, oldPanelsState?: PanelsState): State {
  switch (action.type) {
    case "UNDO_LAYOUT_CHANGE": {
      const ret = undoLayoutChange(state.panels, state.layoutHistory);
      setStoredLayout(ret.panels);
      return { ...state, ...ret };
    }
    case "REDO_LAYOUT_CHANGE": {
      const ret = redoLayoutChange(state.panels, state.layoutHistory);
      setStoredLayout(ret.panels);
      return { ...state, ...ret };
    }
    default:
      if (panelEditingActions.has(action.type)) {
        return {
          ...state,
          layoutHistory: pushLayoutChange(oldPanelsState, state.panels, state.layoutHistory, action),
        };
      }
      return { ...state, layoutHistory: state.layoutHistory };
  }
}
