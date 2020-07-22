// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { mount } from "enzyme";
import { createMemoryHistory } from "history";
import * as React from "react";

import { savePanelConfigs } from "webviz-core/src/actions/panels";
import Panel from "webviz-core/src/components/Panel";
import createRootReducer from "webviz-core/src/reducers";
import configureStore from "webviz-core/src/store/configureStore.testing";
import PanelSetup from "webviz-core/src/stories/PanelSetup";

type DummyConfig = { someString: string };
type DummyProps = { config: DummyConfig, saveConfig: ($Shape<DummyConfig>) => void };

function getDummyPanel(renderFn) {
  class DummyComponent extends React.Component<DummyProps> {
    static panelType = "Dummy";
    static defaultConfig = { someString: "hello world" };

    render() {
      renderFn(this.props);
      return null;
    }
  }
  return Panel<DummyConfig>(DummyComponent);
}

function getStore() {
  return configureStore(createRootReducer(createMemoryHistory()));
}

function Context(props: { children: React.Node, store?: any }) {
  const extraProps = props.store == null ? undefined : { store: props.store };
  return (
    <PanelSetup
      fixture={{
        topics: [{ name: "/some/topic", datatype: "some_datatype" }],
        datatypes: { some_datatype: { fields: [] } },
        frame: {},
      }}
      {...extraProps}>
      {props.children}
    </PanelSetup>
  );
}

describe("Panel", () => {
  it("renders properly with defaultConfig", () => {
    const renderFn = jest.fn();
    const DummyPanel = getDummyPanel(renderFn);

    mount(
      <Context>
        <DummyPanel />
      </Context>
    );

    expect(renderFn.mock.calls.length).toEqual(1);
    expect(renderFn.mock.calls[0]).toEqual([
      {
        capabilities: [],
        config: { someString: "hello world" },
        datatypes: { some_datatype: { fields: [] } },
        openSiblingPanel: expect.any(Function),
        saveConfig: expect.any(Function),
        topics: [{ datatype: "some_datatype", name: "/some/topic" }],
        isHovered: false,
      },
    ]);
  });

  it("gets the config from the store", () => {
    const renderFn = jest.fn();
    const DummyPanel = getDummyPanel(renderFn);

    const childId = "Dummy!1my2ydk";
    const someString = "someNewString";

    const store = getStore();
    store.dispatch(savePanelConfigs({ configs: [{ id: childId, config: { someString } }] }));
    mount(
      <Context store={store}>
        <DummyPanel childId={childId} />
      </Context>
    );

    expect(renderFn.mock.calls.length).toEqual(1);
    expect(renderFn.mock.calls[0]).toEqual([
      {
        capabilities: [],
        config: { someString },
        datatypes: { some_datatype: { fields: [] } },
        openSiblingPanel: expect.any(Function),
        saveConfig: expect.any(Function),
        topics: [{ datatype: "some_datatype", name: "/some/topic" }],
        isHovered: false,
      },
    ]);
  });

  it("does not rerender when another panel changes", () => {
    const renderFn = jest.fn();
    const DummyPanel = getDummyPanel(renderFn);

    const store = getStore();
    mount(
      <Context store={store}>
        <DummyPanel />
      </Context>
    );

    expect(renderFn.mock.calls.length).toEqual(1);
    store.dispatch(savePanelConfigs({ configs: [{ id: "someOtherId", config: {} }] }));
    expect(renderFn.mock.calls.length).toEqual(1);
  });
});
