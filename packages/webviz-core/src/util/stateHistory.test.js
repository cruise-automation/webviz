// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { pushState, redoChange, undoChange, type StateHistory } from "./stateHistory";

describe("pushState", () => {
  it("adds an item to a history", () => {
    const history: StateHistory<number> = { currentState: 0, redoStates: [], undoStates: [] };
    expect(pushState(history, 1)).toEqual({ currentState: 1, redoStates: [], undoStates: [0] });
  });

  it("clears the redo states", () => {
    const history: StateHistory<number> = { currentState: 0, redoStates: [5, 6, 7], undoStates: [] };
    expect(pushState(history, 1)).toEqual({ currentState: 1, redoStates: [], undoStates: [0] });
  });

  it("enforces size bounds on the undo states", () => {
    const history: StateHistory<number> = { currentState: 3, redoStates: [], undoStates: [0, 1, 2] };
    expect(pushState(history, 4, 3)).toEqual({ currentState: 4, redoStates: [], undoStates: [1, 2, 3] });
  });

  it("does not truncate if the size bound is not exceeded", () => {
    const history: StateHistory<number> = { currentState: 3, redoStates: [], undoStates: [0, 1, 2] };
    expect(pushState(history, 4, 10)).toEqual({ currentState: 4, redoStates: [], undoStates: [0, 1, 2, 3] });
  });
});

describe("undoChange", () => {
  it("does nothing when we are at the start of our undo history", () => {
    const history: StateHistory<number> = { currentState: 0, redoStates: [1, 2, 3], undoStates: [] };
    expect(undoChange(history)).toEqual(history);
  });

  it("moves backwards one state in the history", () => {
    const history: StateHistory<number> = { currentState: 1, redoStates: [2], undoStates: [0] };
    expect(undoChange(history)).toEqual({ currentState: 0, redoStates: [1, 2], undoStates: [] });
  });
});

describe("redoChange", () => {
  it("does nothing when we are at the end of our undo history", () => {
    const history: StateHistory<number> = { currentState: 3, redoStates: [], undoStates: [0, 1, 2] };
    expect(redoChange(history)).toEqual(history);
  });

  it("moves forwards one state in the history", () => {
    const history: StateHistory<number> = { currentState: 1, redoStates: [2], undoStates: [0] };
    expect(redoChange(history)).toEqual({ currentState: 2, redoStates: [], undoStates: [0, 1] });
  });
});
