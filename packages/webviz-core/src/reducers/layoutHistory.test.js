// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { createMemoryHistory } from "history";

import delay from "webviz-core/shared/delay";
import { redoLayoutChange, undoLayoutChange } from "webviz-core/src/actions/layoutHistory";
import { changePanelLayout, savePanelConfigs } from "webviz-core/src/actions/panels";
import createRootReducer from "webviz-core/src/reducers";
import { NEVER_PUSH_LAYOUT_THRESHOLD_MS } from "webviz-core/src/reducers/layoutHistory";
import { GLOBAL_STATE_STORAGE_KEY } from "webviz-core/src/reducers/panels";
import configureStore from "webviz-core/src/store";
import Storage from "webviz-core/src/util/Storage";

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
      expect(layoutHistory).toEqual({ lastTimestamp: 0, redoStates: [], undoStates: [] });
    });
  });

  it("can undo and redo layout changes", async () => {
    const storage = new Storage();
    const store = getStore();
    store.dispatch(changePanelLayout({ layout: "foo!1234" }));
    store.checkState((layoutHistory, panels) => {
      expect(layoutHistory.undoStates.length).toEqual(1); // original state
      expect(panels.layout).toEqual("foo!1234");
      expect(storage.get(GLOBAL_STATE_STORAGE_KEY)).toEqual(panels);
    });

    await delay(NEVER_PUSH_LAYOUT_THRESHOLD_MS + 100);
    store.dispatch(changePanelLayout({ layout: "bar!5678" }));
    store.checkState((layoutHistory, panels) => {
      expect(layoutHistory.undoStates.length).toEqual(2); // original and foo!1234
      expect(panels.layout).toEqual("bar!5678");
      expect(storage.get(GLOBAL_STATE_STORAGE_KEY)).toEqual(panels);
    });

    store.dispatch(redoLayoutChange()); // no change from before
    store.checkState((layoutHistory, panels) => {
      expect(layoutHistory.undoStates.length).toEqual(2); // original and foo!1234
      expect(panels.layout).toEqual("bar!5678");
      expect(storage.get(GLOBAL_STATE_STORAGE_KEY)).toEqual(panels);
    });

    store.dispatch(undoLayoutChange()); // no change from before
    store.checkState((layoutHistory, panels) => {
      expect(layoutHistory.undoStates.length).toEqual(1); // original state
      expect(layoutHistory.redoStates.length).toEqual(1); // bar!5678
      expect(panels.layout).toEqual("foo!1234");
      expect(storage.get(GLOBAL_STATE_STORAGE_KEY)).toEqual(panels);
    });

    store.dispatch(redoLayoutChange()); // no change from before
    store.checkState((layoutHistory, panels) => {
      expect(layoutHistory.undoStates.length).toEqual(2); // original and foo!1234
      expect(layoutHistory.redoStates.length).toEqual(0);
      expect(panels.layout).toEqual("bar!5678");
      expect(storage.get(GLOBAL_STATE_STORAGE_KEY)).toEqual(panels);
    });
  });

  it("does not debounce state changes when too much time has passed", () => {
    const store = getStore();

    let timeMs = 100000;
    jest.spyOn(Date, "now").mockImplementation(() => timeMs);

    store.dispatch(changePanelLayout({ layout: "foo!1234" }));
    store.checkState((layoutHistory, panels) => {
      expect(panels.savedProps).toEqual({});
    });

    // Make some changes slowly.
    store.dispatch(savePanelConfigs({ configs: [{ id: "a!1", config: { value: 1 } }] }));
    timeMs += 6000;
    store.dispatch(savePanelConfigs({ configs: [{ id: "a!1", config: { value: 2 } }] }));
    timeMs += 6000;
    store.dispatch(savePanelConfigs({ configs: [{ id: "a!1", config: { value: 3 } }] }));

    store.checkState((layoutHistory, panels) => {
      expect(panels.savedProps).toEqual({ "a!1": { value: 3 } });
    });

    // Do not skip over value=2
    store.dispatch(undoLayoutChange());
    store.checkState((layoutHistory, panels) => {
      expect(panels.savedProps).toEqual({ "a!1": { value: 2 } });
    });

    // Do not skip over value=1
    store.dispatch(undoLayoutChange());
    store.checkState((layoutHistory, panels) => {
      expect(panels.savedProps).toEqual({ "a!1": { value: 1 } });
    });

    // Back to the original state.
    store.dispatch(undoLayoutChange());
    store.checkState((layoutHistory, panels) => {
      expect(panels.savedProps).toEqual({});
    });
  });

  it("suppresses history when not enough time passes", async () => {
    const store = getStore();
    store.dispatch(changePanelLayout({ layout: "foo!1234" }));
    store.checkState((layoutHistory) => {
      expect(layoutHistory.undoStates.length).toEqual(1); // original state
    });

    // No time in between.
    store.dispatch(changePanelLayout({ layout: "foo!1234" }));
    store.checkState((layoutHistory) => {
      expect(layoutHistory.undoStates.length).toEqual(1); // unchanged
    });

    await delay(NEVER_PUSH_LAYOUT_THRESHOLD_MS + 100);
    store.dispatch(changePanelLayout({ layout: "bar!5678" }));
    store.checkState((layoutHistory) => {
      expect(layoutHistory.undoStates.length).toEqual(2); // updated
    });
  });

  it("suppresses history entries when told to", async () => {
    const store = getStore();
    store.dispatch(changePanelLayout({ layout: "foo!1234" }));
    store.checkState((layoutHistory) => {
      expect(layoutHistory.undoStates.length).toEqual(1); // original state
    });

    await delay(NEVER_PUSH_LAYOUT_THRESHOLD_MS + 100);
    store.dispatch(changePanelLayout({ layout: "bar!5678", historyOptions: "SUPPRESS_HISTORY_ENTRY" }));
    store.checkState((layoutHistory) => {
      expect(layoutHistory.undoStates.length).toEqual(1); // unchanged
    });
  });

  it("suppresses history entries when nothing changed", async () => {
    const store = getStore();
    store.dispatch(changePanelLayout({ layout: "foo!1234" }));
    store.checkState((layoutHistory) => {
      expect(layoutHistory.undoStates.length).toEqual(1); // original state
    });

    await delay(NEVER_PUSH_LAYOUT_THRESHOLD_MS + 100);
    store.dispatch(changePanelLayout({ layout: "foo!1234" }));
    store.checkState((layoutHistory) => {
      expect(layoutHistory.undoStates.length).toEqual(1); // unchanged
    });
  });
});
