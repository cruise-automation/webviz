// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { mount } from "enzyme";
import React from "react";
import { Provider } from "react-redux";

import { datatypesReceived, frameReceived, topicsReceived } from "webviz-core/src/actions/dataSource";
import { savePanelConfig } from "webviz-core/src/actions/panels";
import Panel from "webviz-core/src/components/Panel";
import rootReducer from "webviz-core/src/reducers";
import configureStore from "webviz-core/src/store/configureStore.testing";

function getDummyPanel(renderFn) {
  type DummyConfig = {
    someString: string,
  };
  type DummyProps = {
    config: DummyConfig,
    saveConfig: ($Shape<DummyConfig>) => void,
  };
  class DummyComponent extends React.Component<DummyProps> {
    static panelType = "Dummy";
    static defaultConfig = { someString: "hello world" };

    render() {
      renderFn(this.props);
      return null;
    }
  }

  return Panel(DummyComponent);
}

function getStore() {
  const store = configureStore(rootReducer);
  store.dispatch(datatypesReceived({ some_datatype: [] }));
  store.dispatch(topicsReceived([{ name: "/some/topic", datatype: "some_datatype" }]));
  store.dispatch(frameReceived({ "/some/topic": [] }));
  return store;
}

describe("Panel", () => {
  it("renders properly with defaultConfig", () => {
    const renderFn = jest.fn();
    const DummyPanel = getDummyPanel(renderFn);

    const store = getStore();
    mount(
      <Provider store={store}>
        <DummyPanel />
      </Provider>
    );

    expect(renderFn.mock.calls.length).toEqual(1);
    expect(renderFn.mock.calls[0]).toEqual([
      {
        capabilities: [],
        config: { someString: "hello world" },
        datatypes: { some_datatype: [] },
        openSiblingPanel: expect.any(Function),
        saveConfig: expect.any(Function),
        topics: [{ datatype: "some_datatype", name: "/some/topic" }],
      },
    ]);
  });

  it("gets the config from the store", () => {
    const renderFn = jest.fn();
    const DummyPanel = getDummyPanel(renderFn);

    const childId = "someChildId";
    const someString = "someNewString";

    const store = getStore();
    store.dispatch(savePanelConfig({ id: childId, config: { someString } }));
    mount(
      <Provider store={store}>
        <DummyPanel childId={childId} />
      </Provider>
    );

    expect(renderFn.mock.calls.length).toEqual(1);
    expect(renderFn.mock.calls[0]).toEqual([
      {
        capabilities: [],
        config: { someString },
        datatypes: { some_datatype: [] },
        openSiblingPanel: expect.any(Function),
        saveConfig: expect.any(Function),
        topics: [{ datatype: "some_datatype", name: "/some/topic" }],
      },
    ]);
  });

  it("does not rerender when the frame or another panel changes", () => {
    const renderFn = jest.fn();
    const DummyPanel = getDummyPanel(renderFn);

    const store = getStore();
    mount(
      <Provider store={store}>
        <DummyPanel />
      </Provider>
    );

    expect(renderFn.mock.calls.length).toEqual(1);
    store.dispatch(frameReceived({ "/some/other/topic": [] }));
    store.dispatch(savePanelConfig({ id: "someOtherId", config: {} }));
    expect(renderFn.mock.calls.length).toEqual(1);
  });
});
