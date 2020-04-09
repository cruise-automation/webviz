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

import * as layoutHistoryActions from "webviz-core/src/actions/layoutHistory";
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
    const wrapper = document.createElement("div");
    if (!document.body) {
      throw new Error("Satisfy flow: Need a document for this test.");
    }
    document.body.appendChild(wrapper);
    mount(
      <Context store={getStore()}>
        <div data-nativeundoredo="true">
          <textarea id="some-text-area" />
        </div>
        <LayoutHistoryKeyListener />
        <textarea id="other-text-area" />
      </Context>,
      { attachTo: wrapper }
    );
  });

  it("fires undo events", () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true }));
    expect(redoActionCreator).not.toHaveBeenCalled();
    expect(undoActionCreator).toHaveBeenCalledTimes(1);
  });

  it("fires redo events", () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true, shiftKey: true }));
    expect(redoActionCreator).toHaveBeenCalledTimes(1);
    expect(undoActionCreator).not.toHaveBeenCalled();
  });

  it("does not fire undo events from the 'share layout' modal", () => {
    const shareTextarea = document.getElementById("some-text-area");
    if (shareTextarea == null) {
      throw new Error("Satisfy flow: shareTextArea is not null.");
    }
    shareTextarea.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true }));
    expect(undoActionCreator).not.toHaveBeenCalled();
    expect(redoActionCreator).not.toHaveBeenCalled();

    // Check that it does fire in a different text area.
    const otherTextarea = document.getElementById("other-text-area");
    if (!otherTextarea) {
      throw new Error("Satisfy flow: otherTextArea is not null.");
    }
    otherTextarea.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true }));
    expect(undoActionCreator).toHaveBeenCalledTimes(1);
    expect(redoActionCreator).not.toHaveBeenCalled();
  });
});
