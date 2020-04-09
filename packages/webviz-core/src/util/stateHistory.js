// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

export type StateHistory<T> = {
  // All states stored in time order
  currentState: T,
  redoStates: T[],
  undoStates: T[],
};

export const pushState = <T>(history: StateHistory<T>, newState: T, maxHistory: number = Infinity): StateHistory<T> => {
  return {
    currentState: newState,
    redoStates: [],
    undoStates: [...history.undoStates, history.currentState].slice(-maxHistory),
  };
};

export const undoChange = <T>(history: StateHistory<T>): StateHistory<T> => {
  if (!history.undoStates.length) {
    // Return existing state if we have no history.
    // Do not ask users to call "canUndo", do not push dummy items onto the redo queue.
    return history;
  }
  return {
    currentState: history.undoStates[history.undoStates.length - 1],
    redoStates: [history.currentState, ...history.redoStates],
    undoStates: history.undoStates.slice(0, -1),
  };
};

export const redoChange = <T>(history: StateHistory<T>): StateHistory<T> => {
  if (!history.redoStates.length) {
    // Return existing state if we have no redo items.
    // Do not ask users to call "canRedo", do not push dummy items onto the undo queue.
    return history;
  }
  return {
    currentState: history.redoStates[0],
    redoStates: history.redoStates.slice(1),
    undoStates: [...history.undoStates, history.currentState],
  };
};
