// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { mount } from "enzyme";
import { createMemoryHistory } from "history";
import React from "react";
import { act } from "react-dom/test-utils";

import * as layoutHistoryActions from "webviz-core/src/actions/layoutHistory";
import { setExperimentalFeature } from "webviz-core/src/components/ExperimentalFeatures";
import LayoutHistoryKeyListener from "webviz-core/src/components/LayoutHistoryKeyListener";
import { MockMessagePipelineProvider } from "webviz-core/src/components/MessagePipeline";
import createRootReducer from "webviz-core/src/reducers";
import configureStore from "webviz-core/src/store/configureStore.testing";

function getStore() {
  return configureStore(createRootReducer(createMemoryHistory()));
}

function Context(props) {
  return <MockMessagePipelineProvider store={props.store}> {props.children}</MockMessagePipelineProvider>;
}

describe("LayoutHistoryKeyListener", () => {
  let redoActionCreator;
  let undoActionCreator;

  beforeEach(() => {
    redoActionCreator = jest.spyOn(layoutHistoryActions, "redoLayoutChange");
    undoActionCreator = jest.spyOn(layoutHistoryActions, "undoLayoutChange");
    mount(
      <Context store={getStore()}>
        <LayoutHistoryKeyListener />
      </Context>
    );
  });

  it("does not fire history events when the history feature is turned off", () => {
    act(() => setExperimentalFeature("layoutHistory", "alwaysOff"));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true }));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true, shiftKey: true }));
    expect(redoActionCreator).not.toHaveBeenCalled();
    expect(undoActionCreator).not.toHaveBeenCalled();
  });

  it("fires undo events when the history feature is turned on", () => {
    act(() => setExperimentalFeature("layoutHistory", "alwaysOn"));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true }));
    expect(redoActionCreator).not.toHaveBeenCalled();
    expect(undoActionCreator).toHaveBeenCalledTimes(1);
  });

  it("fires redo events when the history feature is turned on", () => {
    act(() => setExperimentalFeature("layoutHistory", "alwaysOn"));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true, shiftKey: true }));
    expect(redoActionCreator).toHaveBeenCalledTimes(1);
    expect(undoActionCreator).not.toHaveBeenCalled();
  });
});
