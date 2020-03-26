// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { createMemoryHistory } from "history";

import { redoLayoutChange, undoLayoutChange } from "webviz-core/src/actions/layoutHistory";
import { changePanelLayout } from "webviz-core/src/actions/panels";
import createRootReducer from "webviz-core/src/reducers";
import configureStore from "webviz-core/src/store";

const getStore = () => {
  const history = createMemoryHistory();
  const store = configureStore(createRootReducer(history), [], history);
  store.checkState = (fn) => fn(store.getState().layoutHistory, store.getState().panels);
  return store;
};

describe("state.layoutHistory", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("stores initial empty history", () => {
    const store = getStore();
    store.checkState((layoutHistory) => {
      expect(layoutHistory).toEqual({ redoStates: [], undoStates: [] });
    });
  });

  it("can undo and redo layout changes", () => {
    const store = getStore();
    store.dispatch(changePanelLayout("foo!1234"));
    store.checkState((layoutHistory, panels) => {
      expect(layoutHistory.undoStates.length).toEqual(1); // original state
      expect(panels.layout).toEqual("foo!1234");
    });

    store.dispatch(changePanelLayout("bar!5678"));
    store.checkState((layoutHistory, panels) => {
      expect(layoutHistory.undoStates.length).toEqual(2); // original and foo!1234
      expect(panels.layout).toEqual("bar!5678");
    });

    store.dispatch(redoLayoutChange()); // no change from before
    store.checkState((layoutHistory, panels) => {
      expect(layoutHistory.undoStates.length).toEqual(2); // original and foo!1234
      expect(panels.layout).toEqual("bar!5678");
    });

    store.dispatch(undoLayoutChange()); // no change from before
    store.checkState((layoutHistory, panels) => {
      expect(layoutHistory.undoStates.length).toEqual(1); // original state
      expect(layoutHistory.redoStates.length).toEqual(1); // bar!5678
      expect(panels.layout).toEqual("foo!1234");
    });

    store.dispatch(redoLayoutChange()); // no change from before
    store.checkState((layoutHistory, panels) => {
      expect(layoutHistory.undoStates.length).toEqual(2); // original and foo!1234
      expect(layoutHistory.redoStates.length).toEqual(0);
      expect(panels.layout).toEqual("bar!5678");
    });
  });
});
