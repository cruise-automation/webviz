// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import fetchMock from "fetch-mock";

import { maybeStoreNewRecentLayout, getRecentLayouts } from "./recentLayouts";
import delay from "webviz-core/shared/delay";
import { fetchLayout } from "webviz-core/src/actions/panels";
import { getGlobalStoreForTest } from "webviz-core/src/store/getGlobalStore";

describe("recentLayouts", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("stores the initial layout in localStorage", () => {
    const initialPersistedState: any = {
      fetchedLayout: {
        data: {
          name: "initialLayout",
        },
      },
    };
    maybeStoreNewRecentLayout(initialPersistedState);
    expect(getRecentLayouts()).toEqual(["initialLayout"]);

    expect(localStorage.getItem("recentLayouts")).toEqual(`["initialLayout"]`);
  });

  it("reads recent layouts from localStorage on initialization", () => {
    localStorage.setItem("recentLayouts", `["storedLayout"]`);
    const initialPersistedState: any = { fetchedLayout: { data: {} } };
    maybeStoreNewRecentLayout(initialPersistedState);
    expect(getRecentLayouts()).toEqual(["storedLayout"]);
  });

  it("updates recentLayouts localStorage item when a new layout appears", async () => {
    const store = getGlobalStoreForTest();
    expect(getRecentLayouts()).toEqual([]);

    fetchMock.get("https://www.foo.com", { status: 200, body: { name: "loadedLayout" } });
    store.dispatch(fetchLayout("?layout-url=https://www.foo.com"));

    await delay(500);
    expect(getRecentLayouts()).toEqual(["loadedLayout"]);
    expect(localStorage.getItem("recentLayouts")).toEqual(`["loadedLayout"]`);

    fetchMock.get("https://www.foo.com", { status: 200, body: { name: "loadedLayout2" } }, { overwriteRoutes: true });
    store.dispatch(fetchLayout("?layout-url=https://www.foo.com"));

    await delay(500);
    expect(getRecentLayouts()).toEqual(["loadedLayout2", "loadedLayout"]);
    expect(localStorage.getItem("recentLayouts")).toEqual(`["loadedLayout2","loadedLayout"]`);
  });
});
