// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import delay from "webviz-core/shared/delay";
import { redoLayoutChange, undoLayoutChange } from "webviz-core/src/actions/layoutHistory";
import { changePanelLayout, savePanelConfigs } from "webviz-core/src/actions/panels";
import { NEVER_PUSH_LAYOUT_THRESHOLD_MS } from "webviz-core/src/reducers/layoutHistory";
import { GLOBAL_STATE_STORAGE_KEY } from "webviz-core/src/reducers/panels";
import { getGlobalStoreForTest } from "webviz-core/src/store/getGlobalStore";
import Storage from "webviz-core/src/util/Storage";

const storage = new Storage();

const getStore = () => {
  const store = getGlobalStoreForTest();
  store.checkState = (fn) => {
    const { persistedState, router, layoutHistory } = store.getState();
    fn({ persistedState: { ...persistedState, search: router.location.search }, layoutHistory, router });
  };
  return store;
};

describe("state.layoutHistory", () => {
  beforeEach(() => {
    storage.clear();
  });

  it("stores initial empty history", () => {
    const store = getStore();
    store.checkState(({ layoutHistory }) => {
      expect(layoutHistory).toEqual({ lastTimestamp: 0, redoStates: [], undoStates: [] });
    });
  });

  it("can undo and redo layout changes", async () => {
    const baseUrl = "http://localhost/";
    const store = getStore();
    store.dispatch(changePanelLayout({ layout: "foo!1234" }));
    history.replaceState(null, document.title, `${baseUrl}?layout=foo!1234`);
    store.checkState(({ layoutHistory, persistedState }) => {
      expect(layoutHistory.undoStates.length).toEqual(1); // original state
      expect(persistedState.panels.layout).toEqual("foo!1234");
      expect(storage.getItem(GLOBAL_STATE_STORAGE_KEY)).toEqual(persistedState);
    });

    await delay(NEVER_PUSH_LAYOUT_THRESHOLD_MS + 100);
    store.dispatch(changePanelLayout({ layout: "bar!5678" }));
    history.replaceState(null, document.title, `${baseUrl}?layout=bar!5678`);
    store.checkState(({ layoutHistory, persistedState }) => {
      expect(layoutHistory.undoStates.length).toEqual(2); // original and foo!1234
      expect(layoutHistory.undoStates.map(({ url }) => url)).toEqual([baseUrl, `${baseUrl}?layout=foo!1234`]);
      expect(persistedState.panels.layout).toEqual("bar!5678");
      expect(storage.getItem(GLOBAL_STATE_STORAGE_KEY)).toEqual(persistedState);
    });

    store.dispatch(redoLayoutChange()); // no change from before
    store.checkState(({ layoutHistory, persistedState }) => {
      expect(layoutHistory.undoStates.length).toEqual(2); // original and foo!1234
      expect(persistedState.panels.layout).toEqual("bar!5678");
      expect(storage.getItem(GLOBAL_STATE_STORAGE_KEY)).toEqual(persistedState);
    });

    store.dispatch(undoLayoutChange()); // no change from before
    store.checkState(({ layoutHistory, persistedState }) => {
      expect(layoutHistory.undoStates.length).toEqual(1); // original state
      expect(layoutHistory.redoStates.length).toEqual(1); // bar!5678
      expect(persistedState.panels.layout).toEqual("foo!1234");
      expect(window.location.href).toEqual(`${baseUrl}?layout=foo!1234`);
      expect(storage.getItem(GLOBAL_STATE_STORAGE_KEY)).toEqual(persistedState);
    });

    store.dispatch(redoLayoutChange()); // no change from before
    store.checkState(({ layoutHistory, persistedState }) => {
      expect(layoutHistory.undoStates.length).toEqual(2); // original and foo!1234
      expect(layoutHistory.redoStates.length).toEqual(0);
      expect(persistedState.panels.layout).toEqual("bar!5678");
      expect(window.location.href).toEqual(`${baseUrl}?layout=bar!5678`);
      expect(storage.getItem(GLOBAL_STATE_STORAGE_KEY)).toEqual(persistedState);
    });
  });

  it("does not debounce state changes when too much time has passed", () => {
    const store = getStore();

    let timeMs = 100000;
    jest.spyOn(Date, "now").mockImplementation(() => timeMs);

    store.dispatch(changePanelLayout({ layout: "foo!1234" }));
    store.checkState(({ persistedState }) => {
      expect(persistedState.panels.savedProps).toEqual({});
    });

    // Make some changes slowly.
    store.dispatch(savePanelConfigs({ configs: [{ id: "a!1", config: { value: 1 } }] }));
    timeMs += 6000;
    store.dispatch(savePanelConfigs({ configs: [{ id: "a!1", config: { value: 2 } }] }));
    timeMs += 6000;
    store.dispatch(savePanelConfigs({ configs: [{ id: "a!1", config: { value: 3 } }] }));

    store.checkState(({ persistedState }) => {
      expect(persistedState.panels.savedProps).toEqual({ "a!1": { value: 3 } });
    });

    // Do not skip over value=2
    store.dispatch(undoLayoutChange());
    store.checkState(({ persistedState }) => {
      expect(persistedState.panels.savedProps).toEqual({ "a!1": { value: 2 } });
    });

    // Do not skip over value=1
    store.dispatch(undoLayoutChange());
    store.checkState(({ persistedState }) => {
      expect(persistedState.panels.savedProps).toEqual({ "a!1": { value: 1 } });
    });

    // Back to the original state.
    store.dispatch(undoLayoutChange());
    store.checkState(({ persistedState }) => {
      expect(persistedState.panels.savedProps).toEqual({});
    });
  });

  it("suppresses history when not enough time passes", async () => {
    const store = getStore();
    store.dispatch(changePanelLayout({ layout: "foo!1234" }));
    store.checkState(({ layoutHistory }) => {
      expect(layoutHistory.undoStates.length).toEqual(1); // original state
    });

    // No time in between.
    store.dispatch(changePanelLayout({ layout: "foo!1234" }));
    store.checkState(({ layoutHistory }) => {
      expect(layoutHistory.undoStates.length).toEqual(1); // unchanged
    });

    await delay(NEVER_PUSH_LAYOUT_THRESHOLD_MS + 100);
    store.dispatch(changePanelLayout({ layout: "bar!5678" }));
    store.checkState(({ layoutHistory }) => {
      expect(layoutHistory.undoStates.length).toEqual(2); // updated
    });
  });

  it("suppresses history entries when told to", async () => {
    const store = getStore();
    store.dispatch(changePanelLayout({ layout: "foo!1234" }));
    store.checkState(({ layoutHistory }) => {
      expect(layoutHistory.undoStates.length).toEqual(1); // original state
    });

    await delay(NEVER_PUSH_LAYOUT_THRESHOLD_MS + 100);
    store.dispatch(changePanelLayout({ layout: "bar!5678", historyOptions: "SUPPRESS_HISTORY_ENTRY" }));
    store.checkState(({ layoutHistory }) => {
      expect(layoutHistory.undoStates.length).toEqual(1); // unchanged
    });
  });

  it("suppresses history entries when nothing changed", async () => {
    const store = getStore();
    store.dispatch(changePanelLayout({ layout: "foo!1234" }));
    store.checkState(({ layoutHistory }) => {
      expect(layoutHistory.undoStates.length).toEqual(1); // original state
    });

    await delay(NEVER_PUSH_LAYOUT_THRESHOLD_MS + 100);
    store.dispatch(changePanelLayout({ layout: "foo!1234" }));
    store.checkState(({ layoutHistory }) => {
      expect(layoutHistory.undoStates.length).toEqual(1); // unchanged
    });
  });
});
