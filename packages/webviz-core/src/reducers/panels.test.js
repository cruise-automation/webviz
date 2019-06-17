// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import createHistory from "history/createMemoryHistory";
import { getLeaves } from "react-mosaic-component";

import { changePanelLayout, savePanelConfig, importPanelLayout } from "webviz-core/src/actions/panels";
import rootReducer from "webviz-core/src/reducers";
import { LAYOUT_KEY, PANEL_PROPS_KEY, GLOBAL_DATA_KEY } from "webviz-core/src/reducers/panels";
import configureStore from "webviz-core/src/store";
import Storage from "webviz-core/src/util/Storage";

const getStore = () => {
  const history = createHistory();
  const store = configureStore(rootReducer, [], history);
  store.checkState = (fn) => fn(store.getState().panels, store.getState().routing);
  // attach a helper method to the test store
  store.push = (path) => history.push(path);
  return store;
};

describe("state.panels", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("stores initial panel layout in local storage", () => {
    const store = getStore();
    store.checkState((panels) => {
      const storage = new Storage();
      expect(storage.get(LAYOUT_KEY)).toEqual(panels.layout);
    });
  });

  it("stores default settings in local storage when layout payload is empty", () => {
    const store = getStore();
    const emptyPayload = {};

    store.dispatch(importPanelLayout(emptyPayload, false));
    store.checkState((panels) => {
      expect(panels.layout.slice(0, 7)).toEqual("RosOut!");
      expect(panels.savedProps).toEqual({});
      const storage = new Storage();
      expect((storage.get(LAYOUT_KEY) || "").slice(0, 7)).toEqual("RosOut!");
      expect(storage.get(PANEL_PROPS_KEY)).toEqual({});
    });
  });

  it("stores state changes in local storage", () => {
    const store = getStore();
    const payload = {
      layout: "foo!bar",
      savedProps: { foo: { test: true } },
    };

    store.checkState((panels, routing) => {
      expect(routing.location.pathname).toEqual("/");
      expect(panels.layout).not.toEqual("foo!bar");
      expect(panels.savedProps).toEqual({});
    });

    store.dispatch(importPanelLayout(payload, false));
    store.checkState((panels) => {
      expect(panels.layout).toEqual("foo!bar");
      expect(panels.savedProps).toEqual({ foo: { test: true } });
      const storage = new Storage();
      expect(storage.get(LAYOUT_KEY)).toEqual(panels.layout);
      expect(storage.get(PANEL_PROPS_KEY)).toEqual(panels.savedProps);
    });

    store.dispatch(changePanelLayout("foo"));
    store.checkState((panels) => {
      expect(panels.layout).toEqual("foo");
      expect(panels.savedProps).toEqual({ foo: { test: true } });
      const storage = new Storage();
      expect(storage.get(LAYOUT_KEY)).toEqual(panels.layout);
      expect(storage.get(PANEL_PROPS_KEY)).toEqual(panels.savedProps);
    });

    store.dispatch(savePanelConfig({ id: "foo", config: { testing: true } }));
    store.checkState((panels) => {
      expect(panels.layout).toEqual("foo");
      expect(panels.savedProps).toEqual({ foo: { test: true, testing: true } });
      const storage = new Storage();
      expect(storage.get(LAYOUT_KEY)).toEqual(panels.layout);
      expect(storage.get(PANEL_PROPS_KEY)).toEqual(panels.savedProps);
    });
  });

  it("sets default globalData value in local storage if globalData is not in migrated payload", () => {
    const store = getStore();
    const payload = {
      layout: "foo!baz",
      savedProps: { foo: { test: true } },
    };

    store.dispatch(importPanelLayout(payload, false));
    store.checkState((panels) => {
      const storage = new Storage();
      expect(storage.get(GLOBAL_DATA_KEY)).toEqual({});
    });
  });

  it("sets globalData value in local storage", () => {
    const store = getStore();
    const globalData = { some_global_data_var: 1 };
    const payload = {
      layout: "foo!baz",
      savedProps: { foo: { test: true } },
      globalData,
    };

    store.dispatch(importPanelLayout(payload, false));
    store.checkState((panels) => {
      const storage = new Storage();
      expect(storage.get(GLOBAL_DATA_KEY)).toEqual(globalData);
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
    return savePanelConfig({ id: "bar", config: { baz: true } });
  });

  testUrlCleanup("removes layout when layout changes", () => {
    return changePanelLayout("foo!bar");
  });

  testUrlCleanup("removes layout when layout is imported", () => {
    return importPanelLayout({ layout: "foo!bar", savedProps: {} }, false);
  });

  it("does not remove layout if layout is imported from url", () => {
    const store = getStore();
    store.push("/?layout=foo&name=bar");
    store.checkState((panels, routing) => {
      expect(routing.location.search).toEqual("?layout=foo&name=bar");
    });
    store.dispatch(importPanelLayout({ layout: null, savedProps: {} }, true));
    store.checkState((panels, routing) => {
      expect(routing.location.search).toEqual("?layout=foo&name=bar");
    });
  });

  it("will set local storage when importing a panel layout, if reducer is not told to skipSettingLocalStorage", () => {
    const store = getStore();
    const storage = new Storage();

    store.dispatch(importPanelLayout({ layout: "myNewLayout", savedProps: {} }, true));
    store.checkState((panels) => {
      expect(storage.get(LAYOUT_KEY)).toEqual("myNewLayout");
    });
  });

  it("will not set local storage when importing a panel layout, if reducer is told to skipSettingLocalStorage", () => {
    const store = getStore();
    const storage = new Storage();

    store.dispatch(importPanelLayout({ layout: null, savedProps: {} }, true, true));
    store.checkState((panels) => {
      expect(storage.get(LAYOUT_KEY)).not.toEqual(panels.layout);
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
      })
    );
    store.checkState((panels, routing) => {
      expect(routing.location.search).toEqual("?layout=foo&name=bar");
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

      const panelConfig = { id: "SecondPanel!2wydzut", config: { foo: "bar" } };
      store.dispatch(savePanelConfig(panelConfig));
      store.dispatch(savePanelConfig({ id: "FirstPanel!34otwwt", config: { baz: true } }));
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
      store.dispatch(savePanelConfig({ id: "foo!1234", config: { okay: true } }));
      store.checkState((panels) => {
        expect(panels.savedProps).toEqual({
          "foo!1234": { okay: true },
        });
      });
    });
  });
});
