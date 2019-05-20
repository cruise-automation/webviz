// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { mount } from "enzyme";
import * as React from "react";

import { savePanelConfig } from "webviz-core/src/actions/panels";
import { getFilteredFormattedTopics } from "webviz-core/src/components/MessageHistory/topicPrefixUtils";
import { MockMessagePipelineProvider } from "webviz-core/src/components/MessagePipeline";
import Panel from "webviz-core/src/components/Panel";
import rootReducer from "webviz-core/src/reducers";
import configureStore from "webviz-core/src/store/configureStore.testing";
import { SECOND_BAG_PREFIX } from "webviz-core/src/util/globalConstants";

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
  return configureStore(rootReducer);
}

function Context(props: { children: React.Node, store?: any }) {
  return (
    <MockMessagePipelineProvider
      topics={[{ name: "/some/topic", datatype: "some_datatype" }]}
      datatypes={{ some_datatype: [] }}
      store={props.store}>
      {props.children}
    </MockMessagePipelineProvider>
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
      <Context store={store}>
        <DummyPanel childId={childId} />
      </Context>
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
    store.dispatch(savePanelConfig({ id: "someOtherId", config: {} }));
    expect(renderFn.mock.calls.length).toEqual(1);
  });
});

it("filters and formats topics appropriately, according to topicPrefix", () => {
  const topics = [
    { name: "/topicA", datatype: "some/datatype" },
    { name: "/other_prefix/topicA", datatype: "some/datatype" },
    { name: "/topicB", datatype: "some/datatype" },
    { name: "/other_prefix/topicB", datatype: "some/datatype" },
    { name: "/topicC", datatype: "some/datatype" },
    { name: "/webviz_bag_2/topicC", datatype: "some/datatype" },
    { name: "/topicD", datatype: "some/datatype" },
    { name: "/webviz_bag_2/topicD", datatype: "some/datatype" },
  ];

  expect(getFilteredFormattedTopics(topics, SECOND_BAG_PREFIX).map((t) => t.name)).toEqual(["/topicC", "/topicD"]);
  expect(getFilteredFormattedTopics(topics, "")).toEqual(topics);
});
