// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { createMemoryHistory } from "history";
import { getLeaves } from "react-mosaic-component";

import { changePanelLayout, savePanelConfig, importPanelLayout, setUserNodes } from "webviz-core/src/actions/panels";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import createRootReducer from "webviz-core/src/reducers";
import { GLOBAL_STATE_STORAGE_KEY } from "webviz-core/src/reducers/panels";
import configureStore from "webviz-core/src/store";
import Storage from "webviz-core/src/util/Storage";

const getStore = () => {
  const history = createMemoryHistory();
  const store = configureStore(createRootReducer(history), [], history);
  store.checkState = (fn) => fn(store.getState().panels, store.getState().router);
  // attach a helper method to the test store
  store.push = (path) => history.push(path);
  return store;
};

const defaultGlobalState = getGlobalHooks().getDefaultGlobalStates();

describe("state.panels", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("stores initial panel layout in local storage", () => {
    const store = getStore();
    store.checkState((panels) => {
      const storage = new Storage();
      const globalState = storage.get(GLOBAL_STATE_STORAGE_KEY) || {};
      expect(globalState.layout).toEqual(panels.layout);
    });
  });

  it("stores default settings in local storage", () => {
    const store = getStore();
    store.checkState((panels) => {
      expect(panels.layout).toEqual(defaultGlobalState.layout);
      expect(panels.savedProps).toEqual({});
      const storage = new Storage();
      expect(storage.get(GLOBAL_STATE_STORAGE_KEY)).toEqual(defaultGlobalState);
    });
  });

  it("stores state changes in local storage", () => {
    const store = getStore();
    const payload = {
      layout: "foo!bar",
      savedProps: { "foo!bar": { test: true } },
    };

    store.checkState((panels, routing) => {
      expect(routing.location.pathname).toEqual("/");
      expect(panels.layout).not.toEqual("foo!bar");
      expect(panels.savedProps).toEqual({});
    });

    store.dispatch(importPanelLayout(payload));
    store.checkState((panels) => {
      expect(panels.layout).toEqual("foo!bar");
      expect(panels.savedProps).toEqual({ "foo!bar": { test: true } });
      const storage = new Storage();
      const globalState = storage.get(GLOBAL_STATE_STORAGE_KEY) || {};
      expect(globalState.layout).toEqual(panels.layout);
      expect(globalState.savedProps).toEqual(panels.savedProps);
    });

    store.dispatch(changePanelLayout("foo!bar"));
    store.checkState((panels) => {
      expect(panels.layout).toEqual("foo!bar");
      expect(panels.savedProps).toEqual({ "foo!bar": { test: true } });
      const storage = new Storage();
      const globalState = storage.get(GLOBAL_STATE_STORAGE_KEY) || {};
      expect(globalState.layout).toEqual(panels.layout);
      expect(globalState.savedProps).toEqual(panels.savedProps);
    });

    store.dispatch(savePanelConfig({ id: "foo!bar", config: { testing: true }, defaultConfig: { testing: false } }));
    store.checkState((panels) => {
      expect(panels.layout).toEqual("foo!bar");
      expect(panels.savedProps).toEqual({ "foo!bar": { test: true, testing: true } });
      const storage = new Storage();
      const globalState = storage.get(GLOBAL_STATE_STORAGE_KEY) || {};
      expect(globalState.layout).toEqual(panels.layout);
      expect(globalState.savedProps).toEqual(panels.savedProps);
    });
  });

  it("sets default globalVariables, linkedGlobalVariables, userNodes in local storage if values are not in migrated payload", () => {
    const store = getStore();
    const payload = {
      layout: "foo!baz",
      savedProps: { foo: { test: true } },
    };

    store.dispatch(importPanelLayout(payload));
    store.checkState((panels) => {
      const storage = new Storage();
      const globalState = storage.get(GLOBAL_STATE_STORAGE_KEY) || {};
      expect(globalState.globalVariables).toEqual({});
      expect(globalState.userNodes).toEqual({});
      expect(globalState.linkedGlobalVariables).toEqual([]);
    });
  });

  it("sets default speed in local storage if playbackConfig object is not in migrated payload", () => {
    const store = getStore();
    const payload = {
      layout: "foo!baz",
      savedProps: { foo: { test: true } },
    };

    store.dispatch(importPanelLayout(payload));
    store.checkState((panels) => {
      const storage = new Storage();
      const globalState = storage.get(GLOBAL_STATE_STORAGE_KEY) || {};
      expect(globalState.playbackConfig).toEqual({ speed: 0.2 });
    });
  });

  it("sets globalVariables, userNodes, linkedGlobalVariables in local storage", () => {
    const store = getStore();
    const globalVariables = { some_global_data_var: 1 };
    const linkedGlobalVariables = [{ topic: "/foo", markerKeyPath: ["bar", "1"], name: "someVariableName" }];
    const userNodes = { foo: { name: "foo", sourceCode: "foo node" } };
    const payload = {
      layout: "foo!baz",
      savedProps: { foo: { test: true } },
      globalVariables,
      userNodes,
      linkedGlobalVariables,
    };

    store.dispatch(importPanelLayout(payload));
    store.checkState((panels) => {
      const storage = new Storage();
      const globalState = storage.get(GLOBAL_STATE_STORAGE_KEY) || {};
      expect(globalState.globalVariables).toEqual(globalVariables);
      expect(globalState.userNodes).toEqual(userNodes);
      expect(globalState.linkedGlobalVariables).toEqual(linkedGlobalVariables);
    });
  });

  it("sets restrictedTopics in local storage if present", () => {
    const store = getStore();
    const payload = {
      layout: "foo!baz",
      savedProps: { foo: { test: true } },
      restrictedTopics: ["1", "2", "3"],
    };

    store.dispatch(importPanelLayout(payload));
    store.checkState((panels) => {
      const storage = new Storage();
      const globalState = storage.get(GLOBAL_STATE_STORAGE_KEY) || {};
      expect(globalState.restrictedTopics).toEqual(payload.restrictedTopics);
    });
  });

  it("change globalData key to globalVariables if only globalData key is present", () => {
    const store = getStore();
    const globalVariables = { some_global_data_var: 1 };
    const payload = { globalData: globalVariables, layout: "foo!baz" };
    store.dispatch(importPanelLayout(payload, { isFromUrl: true }));
    store.checkState((panels) => {
      const storage = new Storage();
      const globalState = storage.get(GLOBAL_STATE_STORAGE_KEY) || {};
      expect(globalState.globalVariables).toEqual(globalVariables);
    });
  });

  it("delete globalData key if both globalVariables and globalData are present", () => {
    const store = getStore();
    const globalVariables = { some_global_data_var: 1 };
    const payload = { globalData: { some_var: 2 }, globalVariables, layout: "foo!baz" };
    store.dispatch(importPanelLayout(payload, { isFromUrl: true }));
    store.checkState((panels) => {
      const storage = new Storage();
      const globalState = storage.get(GLOBAL_STATE_STORAGE_KEY) || {};
      expect(globalState.globalData).toBe(undefined);
    });
  });

  const testUrlCleanup = (desc, actionCreator) => {
    it(desc, () => {
      const store = getStore();
      store.push("/?layout=foo");
      store.checkState((panels, routing) => {
        expect(routing.location.search).toEqual("?layout=foo");
      });
      store.dispatch(actionCreator());
      store.checkState((panels, routing) => {
        expect(routing.location.search).toEqual("");
      });

      store.push("/?layout=foo&name=bar");
      store.dispatch(actionCreator());
      store.checkState((panels, routing) => {
        expect(routing.location.search).toEqual("?name=bar");
      });

      store.push("/?laYOut=zug&layout=foo&name=bar");
      store.dispatch(actionCreator());
      store.checkState((panels, routing) => {
        expect(routing.location.search).toEqual("?laYOut=zug&name=bar");
      });
    });
  };

  testUrlCleanup("removes layout when config changes", () => {
    return savePanelConfig({ id: "bar", config: { baz: true }, defaultConfig: {} });
  });

  testUrlCleanup("removes layout when layout changes", () => {
    return changePanelLayout("foo!bar");
  });

  testUrlCleanup("removes layout when layout is imported", () => {
    return importPanelLayout({ layout: "foo!bar", savedProps: {} });
  });

  it("does not remove layout if layout is imported from url", () => {
    const store = getStore();
    store.push("/?layout=foo&name=bar");
    store.checkState((panels, routing) => {
      expect(routing.location.search).toEqual("?layout=foo&name=bar");
    });
    store.dispatch(importPanelLayout({ layout: null, savedProps: {} }, { isFromUrl: true }));
    store.checkState((panels, routing) => {
      expect(routing.location.search).toEqual("?layout=foo&name=bar");
    });
  });

  it("will set local storage when importing a panel layout, if reducer is not told to skipSettingLocalStorage", () => {
    const store = getStore();
    const storage = new Storage();

    store.dispatch(importPanelLayout({ layout: "myNewLayout", savedProps: {} }, { isFromUrl: true }));
    store.checkState((panels) => {
      const globalState = storage.get(GLOBAL_STATE_STORAGE_KEY) || {};
      expect(globalState.layout).toEqual("myNewLayout");
    });
  });

  it("will not set local storage when importing a panel layout, if reducer is told to skipSettingLocalStorage", () => {
    const store = getStore();
    const storage = new Storage();

    store.dispatch(
      importPanelLayout({ layout: null, savedProps: {} }, { isFromUrl: true, skipSettingLocalStorage: true })
    );
    store.checkState((panels) => {
      const globalState = storage.get(GLOBAL_STATE_STORAGE_KEY) || {};
      expect(globalState.layout).not.toEqual(panels.layout);
    });
  });

  it("does not remove layout if config are saved silently", () => {
    const store = getStore();
    store.dispatch(changePanelLayout("foo"));
    store.push("/?layout=foo&name=bar");
    store.checkState((panels, routing) => {
      expect(routing.location.search).toEqual("?layout=foo&name=bar");
    });
    store.dispatch(
      savePanelConfig({
        id: "foo",
        silent: true,
        config: { bar: true },
        defaultConfig: { bar: false },
      })
    );
    store.checkState((panels, routing) => {
      expect(routing.location.search).toEqual("?layout=foo&name=bar");
    });
  });

  it("saves and overwrites Webviz nodes", () => {
    const store = getStore();
    const firstPayload = { foo: { name: "foo", sourceCode: "bar" } };
    const secondPayload = { bar: { name: "bar", sourceCode: "baz" } };

    store.dispatch(setUserNodes(firstPayload));
    store.checkState((panelState) => {
      expect(panelState.userNodes).toEqual(firstPayload);
    });

    store.dispatch(setUserNodes(secondPayload));
    store.checkState((panelState) => {
      expect(panelState.userNodes).toEqual({ ...firstPayload, ...secondPayload });
    });
  });

  describe("clearing old saved config", () => {
    const panelState = {
      layout: {
        direction: "row",
        second: {
          direction: "column",
          second: "SecondPanel!2wydzut",
          first: { direction: "row", second: "ThirdPanel!ye6m1m", first: "FourthPanel!v3l5mu" },
        },
        first: "FirstPanel!34otwwt",
      },
      savedProps: {},
    };

    it("removes config when the panel is removed from the layout", () => {
      const store = getStore();
      store.dispatch(changePanelLayout(panelState.layout));
      store.checkState((panels) => {
        // i want to verify my assumption on how mosaic helper works so if it changes we can know about it
        const leaves = getLeaves(panelState.layout);
        expect(leaves).toHaveLength(4);
        expect(leaves).toContain("FirstPanel!34otwwt");
        expect(leaves).toContain("SecondPanel!2wydzut");
        expect(leaves).toContain("ThirdPanel!ye6m1m");
        expect(leaves).toContain("FourthPanel!v3l5mu");
        expect(panels.savedProps).toEqual({});
      });

      const panelConfig = { id: "SecondPanel!2wydzut", config: { foo: "bar" }, defaultConfig: { foo: "" } };
      store.dispatch(savePanelConfig(panelConfig));
      store.dispatch(
        savePanelConfig({ id: "FirstPanel!34otwwt", config: { baz: true }, defaultConfig: { baz: false } })
      );
      store.checkState((panels) => {
        expect(panels.savedProps).toEqual({
          "SecondPanel!2wydzut": { foo: "bar" },
          "FirstPanel!34otwwt": { baz: true },
        });
      });
      store.dispatch(
        changePanelLayout({ direction: "row", first: "FirstPanel!34otwwt", second: "SecondPanel!2wydzut" })
      );
      store.checkState((panels) => {
        expect(panels.savedProps).toEqual({
          "SecondPanel!2wydzut": { foo: "bar" },
          "FirstPanel!34otwwt": { baz: true },
        });
      });
      store.dispatch(changePanelLayout({ direction: "row", first: "FirstPanel!34otwwt", second: "ThirdPanel!ye6m1m" }));
      store.checkState((panels) => {
        expect(panels.savedProps).toEqual({
          "FirstPanel!34otwwt": { baz: true },
        });
      });
      store.dispatch(changePanelLayout("foo!1234"));
      store.checkState((panels) => {
        expect(panels.savedProps).toEqual({});
      });
      store.dispatch(savePanelConfig({ id: "foo!1234", config: { okay: true }, defaultConfig: { okay: false } }));
      store.checkState((panels) => {
        expect(panels.savedProps).toEqual({
          "foo!1234": { okay: true },
        });
      });
    });
  });
});
