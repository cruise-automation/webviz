// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { createMemoryHistory } from "history";
import { getLeaves } from "react-mosaic-component";

import {
  changePanelLayout,
  savePanelConfigs,
  importPanelLayout,
  createTabPanel,
  setUserNodes,
  splitPanel,
  swapPanel,
} from "webviz-core/src/actions/panels";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import createRootReducer from "webviz-core/src/reducers";
import { GLOBAL_STATE_STORAGE_KEY } from "webviz-core/src/reducers/panels";
import configureStore from "webviz-core/src/store";
import { TAB_PANEL_TYPE } from "webviz-core/src/util/globalConstants";
import { getPanelTypeFromId } from "webviz-core/src/util/layout";
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

    store.checkState((panels, router) => {
      expect(router.location.pathname).toEqual("/");
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

    store.dispatch(changePanelLayout({ layout: "foo!bar" }));
    store.checkState((panels) => {
      expect(panels.layout).toEqual("foo!bar");
      expect(panels.savedProps).toEqual({ "foo!bar": { test: true } });
      const storage = new Storage();
      const globalState = storage.get(GLOBAL_STATE_STORAGE_KEY) || {};
      expect(globalState.layout).toEqual(panels.layout);
      expect(globalState.savedProps).toEqual(panels.savedProps);
    });

    store.dispatch(
      savePanelConfigs({ configs: [{ id: "foo!bar", config: { testing: true }, defaultConfig: { testing: false } }] })
    );
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
      expect(globalState.playbackConfig).toEqual({ messageOrder: "receiveTime", speed: 0.2 });
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
      store.checkState((panels, router) => {
        expect(router.location.search).toEqual("?layout=foo");
      });
      store.dispatch(actionCreator());
      store.checkState((panels, router) => {
        expect(router.location.search).toEqual("");
      });

      store.push("/?layout=foo&name=bar");
      store.dispatch(actionCreator());
      store.checkState((panels, router) => {
        expect(router.location.search).toEqual("?name=bar");
      });

      store.push("/?laYOut=zug&layout=foo&name=bar");
      store.dispatch(actionCreator());
      store.checkState((panels, router) => {
        expect(router.location.search).toEqual("?laYOut=zug&name=bar");
      });
    });
  };

  testUrlCleanup("removes layout when config changes", () => {
    return savePanelConfigs({ configs: [{ id: "bar", config: { baz: true } }] });
  });

  testUrlCleanup("removes layout when layout changes", () => {
    return changePanelLayout({ layout: "foo!bar" });
  });

  testUrlCleanup("removes layout when layout is imported", () => {
    return importPanelLayout({ layout: "foo!bar", savedProps: {} });
  });

  it("does not remove layout if layout is imported from url", () => {
    const store = getStore();
    store.push("/?layout=foo&name=bar");
    store.checkState((panels, router) => {
      expect(router.location.search).toEqual("?layout=foo&name=bar");
    });
    store.dispatch(importPanelLayout({ layout: null, savedProps: {} }, { isFromUrl: true }));
    store.checkState((panels, router) => {
      expect(router.location.search).toEqual("?layout=foo&name=bar");
    });
  });

  it("resets panels to a valid state when importing an empty layout", () => {
    const store = getStore();
    store.dispatch(importPanelLayout({ layout: undefined }));
    expect(store.getState().panels).toEqual({
      globalVariables: {},
      layout: {},
      linkedGlobalVariables: [],
      playbackConfig: { messageOrder: "receiveTime", speed: 0.2 },
      savedProps: {},
      userNodes: {},
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

  describe("creates Tab panels from existing panels correctly", () => {
    const store = getStore();
    const regularLayoutPayload = {
      layout: {
        first: "Audio!a",
        second: { first: "RawMessages!a", second: "Audio!c", direction: "column" },
        direction: "row",
      },
      savedProps: { "Audio!a": { foo: "bar" }, "RawMessages!a": { foo: "baz" } },
    };
    const basePayload = {
      idToReplace: "Audio!a",
      newId: "Tab!a",
      idsToRemove: ["Audio!a", "RawMessages!a"],
    };
    const nestedLayoutPayload = {
      layout: {
        first: "Audio!a",
        second: "Tab!z",
        direction: "column",
      },
      savedProps: {
        "Audio!a": { foo: "bar" },
        "Tab!z": {
          activeTabIdx: 0,
          tabs: [{ title: "First tab", layout: { first: "Audio!b", second: "RawMessages!a", direction: "row" } }],
        },
        "Audio!b": { foo: "baz" },
        "RawMessages!a": { raw: "messages" },
      },
    };
    const createTabPanelPayload = {
      ...basePayload,
      layout: regularLayoutPayload.layout,
    };
    const nestedCreateTabPanelPayload = {
      ...basePayload,
      layout: nestedLayoutPayload.layout,
    };

    it("will group selected panels into a Tab panel", () => {
      store.dispatch(importPanelLayout(regularLayoutPayload, { isFromUrl: true, skipSettingLocalStorage: true }));
      store.dispatch(createTabPanel({ ...createTabPanelPayload, singleTab: true }));

      store.checkState(({ savedProps, layout }) => {
        expect(getPanelTypeFromId(layout.first)).toEqual(TAB_PANEL_TYPE);
        expect(getPanelTypeFromId(layout.second)).toEqual("Audio");
        expect(savedProps[layout.first]).toEqual({
          activeTabIdx: 0,
          tabs: [{ title: "1", layout: { direction: "row", first: "Audio!a", second: "RawMessages!a" } }],
        });
        expect(savedProps[layout.second]).toEqual(regularLayoutPayload.savedProps[layout.second]);
      });
    });

    it("will group selected panels into a Tab panel, even when a selected panel is nested", () => {
      store.dispatch(importPanelLayout(nestedLayoutPayload, { isFromUrl: true, skipSettingLocalStorage: true }));
      store.dispatch(createTabPanel({ ...nestedCreateTabPanelPayload, singleTab: true }));

      store.checkState(({ savedProps, layout }) => {
        expect(getPanelTypeFromId(layout.first)).toEqual(TAB_PANEL_TYPE);
        expect(getPanelTypeFromId(layout.second)).toEqual(TAB_PANEL_TYPE);
        expect(savedProps[layout.first]).toEqual({
          activeTabIdx: 0,
          tabs: [{ title: "1", layout: { direction: "column", first: "Audio!a", second: "RawMessages!a" } }],
        });
        expect(savedProps[layout.second]).toEqual({
          activeTabIdx: 0,
          tabs: [{ title: "First tab", layout: "Audio!b" }],
        });
      });
    });

    it("will create individual tabs for selected panels in a new Tab panel", () => {
      store.dispatch(importPanelLayout(regularLayoutPayload, { isFromUrl: true, skipSettingLocalStorage: true }));
      store.dispatch(createTabPanel({ ...createTabPanelPayload, singleTab: false }));

      store.checkState(({ savedProps, layout }) => {
        expect(getPanelTypeFromId(layout.first)).toEqual(TAB_PANEL_TYPE);
        expect(getPanelTypeFromId(layout.second)).toEqual("Audio");
        expect(savedProps[layout.first]).toEqual({
          activeTabIdx: 0,
          tabs: [{ title: "Audio", layout: "Audio!a" }, { title: "RawMessages", layout: "RawMessages!a" }],
        });
        expect(savedProps[layout.second]).toEqual(regularLayoutPayload.savedProps[layout.second]);
      });
    });

    it("will create individual tabs for selected panels in a new Tab panel, even when a selected panel is nested", () => {
      store.dispatch(importPanelLayout(nestedLayoutPayload, { isFromUrl: true, skipSettingLocalStorage: true }));
      store.dispatch(createTabPanel({ ...nestedCreateTabPanelPayload, singleTab: false }));

      store.checkState(({ layout, savedProps }) => {
        expect(getPanelTypeFromId(layout.first)).toEqual(TAB_PANEL_TYPE);
        expect(getPanelTypeFromId(layout.second)).toEqual(TAB_PANEL_TYPE);
        expect(savedProps[layout.first]).toEqual({
          activeTabIdx: 0,
          tabs: [{ title: "Audio", layout: "Audio!a" }, { title: "RawMessages", layout: "RawMessages!a" }],
        });
        expect(savedProps[layout.second]).toEqual({
          activeTabIdx: 0,
          tabs: [{ title: "First tab", layout: "Audio!b" }],
        });
      });
    });
  });

  it("does not remove layout if config are saved silently", () => {
    const store = getStore();
    store.dispatch(changePanelLayout({ layout: "foo" }));
    store.push("/?layout=foo&name=bar");
    store.checkState((panels, router) => {
      expect(router.location.search).toEqual("?layout=foo&name=bar");
    });
    store.dispatch(
      savePanelConfigs({
        silent: true,
        configs: [
          {
            id: "foo",
            config: { bar: true },
            defaultConfig: { bar: false },
          },
        ],
      })
    );
    store.checkState((panels, router) => {
      expect(router.location.search).toEqual("?layout=foo&name=bar");
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

  describe("panel toolbar actions", () => {
    it("can split panel", () => {
      const store = getStore();
      store.dispatch(changePanelLayout({ layout: "Audio!a" }));

      const audioConfig = { foo: "bar" };
      store.dispatch(savePanelConfigs({ configs: [{ id: "Audio!a", config: audioConfig }] }));

      store.dispatch(splitPanel({ id: "Audio!a", config: audioConfig, direction: "row", path: [], root: "Audio!a" }));
      store.checkState(({ layout, savedProps }) => {
        expect(layout.first).toEqual("Audio!a");
        expect(getPanelTypeFromId(layout.second)).toEqual("Audio");
        expect(layout.direction).toEqual("row");
        expect(savedProps["Audio!a"]).toEqual(audioConfig);
        expect(savedProps[layout.second]).toEqual(audioConfig);
      });
    });

    it("can split Tab panel", () => {
      const store = getStore();
      store.dispatch(changePanelLayout({ layout: "Tab!a" }));

      const audioConfig = { foo: "bar" };
      const tabConfig = { activeTabIdx: 0, tabs: [{ title: "A", layout: "Audio!a" }] };
      store.dispatch(
        savePanelConfigs({
          configs: [{ id: "Tab!a", config: tabConfig }, { id: "Audio!a", config: audioConfig }],
        })
      );

      store.dispatch(splitPanel({ id: "Tab!a", config: tabConfig, direction: "row", path: [], root: "Tab!a" }));
      store.checkState(({ layout, savedProps }) => {
        expect(layout.first).toEqual("Tab!a");
        expect(getPanelTypeFromId(layout.second)).toEqual("Tab");
        expect(layout.direction).toEqual("row");
        expect(savedProps["Tab!a"]).toEqual(tabConfig);
        expect(getPanelTypeFromId(savedProps[layout.second].tabs[0].layout)).toEqual("Audio");
        expect(savedProps["Audio!a"]).toEqual(audioConfig);
      });
    });

    it("can split panel inside Tab panel", () => {
      const store = getStore();
      store.dispatch(changePanelLayout({ layout: "Tab!a" }));

      const audioConfig = { foo: "bar" };
      const tabConfig = { activeTabIdx: 0, tabs: [{ title: "A", layout: "Audio!a" }] };
      store.dispatch(
        savePanelConfigs({
          configs: [{ id: "Tab!a", config: tabConfig }, { id: "Audio!a", config: audioConfig }],
        })
      );

      store.dispatch(
        splitPanel({ id: "Audio!a", tabId: "Tab!a", config: audioConfig, direction: "row", path: [], root: "Audio!a" })
      );
      store.checkState(({ layout, savedProps }) => {
        expect(layout).toEqual("Tab!a");
        const tabLayout = savedProps["Tab!a"].tabs[0].layout;
        expect(tabLayout.first).toEqual("Audio!a");
        expect(getPanelTypeFromId(tabLayout.second)).toEqual("Audio");
        expect(tabLayout.direction).toEqual("row");
        expect(savedProps["Audio!a"]).toEqual(audioConfig);
        expect(savedProps[tabLayout.second]).toEqual(audioConfig);
      });
    });

    it("can swap panels", () => {
      const store = getStore();
      store.dispatch(changePanelLayout({ layout: "Audio!a" }));

      const audioConfig = { foo: "bar" };
      const rawMessagesConfig = { foo: "baz" };
      store.dispatch(savePanelConfigs({ configs: [{ id: "Audio!a", config: audioConfig }] }));

      store.dispatch(
        swapPanel({
          originalId: "Audio!a",
          type: "RawMessages",
          config: rawMessagesConfig,
          path: [],
          root: "Audio!a",
        })
      );
      store.checkState(({ layout, savedProps }) => {
        expect(getPanelTypeFromId(layout)).toEqual("RawMessages");
        expect(savedProps["Audio!a"]).toEqual(undefined);
        expect(savedProps[layout]).toEqual(rawMessagesConfig);
      });
    });

    it("can swap panel for a Tab panel", () => {
      const store = getStore();
      store.dispatch(changePanelLayout({ layout: "Audio!a" }));

      const audioConfig = { foo: "bar" };
      const tabConfig = { activeTabIdx: 0, tabs: [{ title: "A", layout: "RawMessages!a" }] };
      const rawMessagesConfig = { path: "foo" };
      store.dispatch(savePanelConfigs({ configs: [{ id: "Audio!a", config: audioConfig }] }));

      store.dispatch(
        swapPanel({
          originalId: "Audio!a",
          type: "Tab",
          config: tabConfig,
          relatedConfigs: { "RawMessages!a": rawMessagesConfig },
          path: [],
          root: "Audio!a",
        })
      );
      store.checkState(({ layout, savedProps }) => {
        expect(getPanelTypeFromId(layout)).toEqual("Tab");
        const tabLayout = savedProps[layout].tabs[0].layout;
        expect(getPanelTypeFromId(tabLayout)).toEqual("RawMessages");
        expect(savedProps[tabLayout]).toEqual(rawMessagesConfig);
      });
    });

    it("can swap panel inside a Tab", () => {
      const store = getStore();
      store.dispatch(changePanelLayout({ layout: "Tab!a" }));

      const rawMessagesConfig = { foo: "baz" };
      const tabConfig = { activeTabIdx: 0, tabs: [{ title: "A", layout: "Audio!a" }] };
      store.dispatch(
        savePanelConfigs({
          configs: [{ id: "Tab!a", config: tabConfig }],
        })
      );

      store.dispatch(
        swapPanel({
          originalId: "Audio!a",
          tabId: "Tab!a",
          type: "RawMessages",
          config: rawMessagesConfig,
          path: [],
          root: "Audio!a",
        })
      );
      store.checkState(({ layout, savedProps }) => {
        expect(layout).toEqual("Tab!a");
        const tabLayout = savedProps["Tab!a"].tabs[0].layout;
        expect(getPanelTypeFromId(tabLayout)).toEqual("RawMessages");
        expect(savedProps[tabLayout]).toEqual(rawMessagesConfig);
      });
    });
  });

  describe("clearing old saved config", () => {
    const panelState = {
      layout: {
        direction: "row",
        first: "FirstPanel!34otwwt",
        second: {
          direction: "column",
          second: "SecondPanel!2wydzut",
          first: { direction: "row", second: "ThirdPanel!ye6m1m", first: "FourthPanel!abc" },
        },
      },
      savedProps: {},
    };
    const tabPanelState = {
      layout: {
        direction: "row",
        first: "FirstPanel!34otwwt",
        second: {
          direction: "column",
          second: "SecondPanel!2wydzut",
          first: { direction: "row", second: "ThirdPanel!ye6m1m", first: "Tab!abc" },
        },
      },
      savedProps: {},
    };

    it("removes a panel's savedProps when it is removed from the layout", () => {
      const store = getStore();
      store.dispatch(changePanelLayout({ layout: panelState.layout }));
      store.checkState((panels) => {
        const leaves = getLeaves(panelState.layout);
        expect(leaves).toHaveLength(4);
        expect(leaves).toContain("FirstPanel!34otwwt");
        expect(leaves).toContain("SecondPanel!2wydzut");
        expect(leaves).toContain("ThirdPanel!ye6m1m");
        expect(leaves).toContain("FourthPanel!abc");
        expect(panels.savedProps).toEqual({});
      });

      const panelConfig = { id: "SecondPanel!2wydzut", config: { foo: "bar" }, defaultConfig: { foo: "" } };
      store.dispatch(
        savePanelConfigs({
          configs: [panelConfig, { id: "FirstPanel!34otwwt", config: { baz: true }, defaultConfig: { baz: false } }],
        })
      );
      store.checkState((panels) => {
        expect(panels.savedProps).toEqual({
          "SecondPanel!2wydzut": { foo: "bar" },
          "FirstPanel!34otwwt": { baz: true },
        });
      });
      store.dispatch(
        changePanelLayout({ layout: { direction: "row", first: "FirstPanel!34otwwt", second: "SecondPanel!2wydzut" } })
      );
      store.checkState((panels) => {
        expect(panels.savedProps).toEqual({
          "SecondPanel!2wydzut": { foo: "bar" },
          "FirstPanel!34otwwt": { baz: true },
        });
      });
      store.dispatch(
        changePanelLayout({ layout: { direction: "row", first: "FirstPanel!34otwwt", second: "ThirdPanel!ye6m1m" } })
      );
      store.checkState((panels) => {
        expect(panels.savedProps).toEqual({
          "FirstPanel!34otwwt": { baz: true },
        });
      });
      store.dispatch(changePanelLayout({ layout: "foo!1234" }));
      store.checkState((panels) => {
        expect(panels.savedProps).toEqual({});
      });
      store.dispatch(
        savePanelConfigs({ configs: [{ id: "foo!1234", config: { okay: true }, defaultConfig: { okay: false } }] })
      );
      store.checkState((panels) => {
        expect(panels.savedProps).toEqual({
          "foo!1234": { okay: true },
        });
      });
    });

    it("removes a panel's savedProps when it is removed from Tab panel", () => {
      const store = getStore();
      store.dispatch(changePanelLayout({ layout: tabPanelState.layout }));
      store.checkState((panels) => {
        const leaves = getLeaves(tabPanelState.layout);
        expect(leaves).toHaveLength(4);
        expect(leaves).toContain("FirstPanel!34otwwt");
        expect(leaves).toContain("SecondPanel!2wydzut");
        expect(leaves).toContain("ThirdPanel!ye6m1m");
        expect(leaves).toContain("Tab!abc");
        expect(panels.savedProps).toEqual({});
      });

      const baseTabConfig = {
        id: "Tab!abc",
        config: { tabs: [{ title: "Tab A", layout: "NestedPanel!xyz" }], activeTabIdx: 0 },
      };
      store.dispatch(savePanelConfigs({ configs: [baseTabConfig] }));
      store.checkState((panels) => {
        expect(panels.savedProps).toEqual({ "Tab!abc": baseTabConfig.config });
      });

      const nestedPanelConfig = { id: "NestedPanel!xyz", config: { foo: "bar" } };
      store.dispatch(savePanelConfigs({ configs: [nestedPanelConfig] }));
      store.checkState((panels) => {
        expect(panels.savedProps).toEqual({
          "Tab!abc": baseTabConfig.config,
          "NestedPanel!xyz": nestedPanelConfig.config,
        });
      });

      const emptyTabConfig = { id: "Tab!abc", config: { tabs: [{ title: "Tab A", layout: null }], activeTabIdx: 0 } };
      store.dispatch(savePanelConfigs({ configs: [emptyTabConfig] }));
      store.checkState((panels) => {
        // "NestedPanel!xyz" key in savedProps should be gone
        expect(panels.savedProps).toEqual({ "Tab!abc": emptyTabConfig.config });
      });
    });

    it("does not remove old savedProps when trimSavedProps = false", () => {
      const store = getStore();
      store.dispatch(changePanelLayout({ layout: "foo!bar" }));
      store.dispatch(savePanelConfigs({ configs: [{ id: "foo!bar", config: { foo: "baz" } }] }));
      store.dispatch(changePanelLayout({ layout: tabPanelState.layout }));
      store.checkState((panels) => {
        expect(panels.savedProps).toEqual({});
      });

      store.dispatch(changePanelLayout({ layout: "foo!bar" }));
      store.dispatch(savePanelConfigs({ configs: [{ id: "foo!bar", config: { foo: "baz" } }] }));
      store.dispatch(changePanelLayout({ layout: tabPanelState.layout, trimSavedProps: false }));
      store.checkState((panels) => {
        expect(panels.savedProps).toEqual({ "foo!bar": { foo: "baz" } });
      });
    });
  });
});
