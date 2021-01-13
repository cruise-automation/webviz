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
import GlobalKeyListener from "webviz-core/src/components/GlobalKeyListener";
import { MockMessagePipelineProvider } from "webviz-core/src/components/MessagePipeline";
import createRootReducer from "webviz-core/src/reducers";
import configureStore from "webviz-core/src/store/configureStore.testing";

function getStore() {
  return configureStore(createRootReducer(createMemoryHistory()));
}

function Context(props) {
  return <MockMessagePipelineProvider store={props.store}> {props.children}</MockMessagePipelineProvider>;
}
const mockHistory = {
  push: () => {},
};
describe("GlobalKeyListener", () => {
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
        <GlobalKeyListener history={mockHistory} />
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

  it("does not fire undo/redo events from editable fields", () => {
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
    expect(undoActionCreator).not.toHaveBeenCalled();
    expect(redoActionCreator).not.toHaveBeenCalled();
  });

  it("calls openSaveLayoutModal after pressing cmd/ctrl + s/S keys", async () => {
    const wrapper = document.createElement("div");
    const openSaveLayoutModal = jest.fn();
    mount(
      <Context store={getStore()}>
        <GlobalKeyListener history={mockHistory} openSaveLayoutModal={openSaveLayoutModal} />
      </Context>,
      { attachTo: wrapper }
    );

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "s", ctrlKey: true }));
    expect(openSaveLayoutModal).toHaveBeenCalledTimes(1);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "S", metaKey: true }));
    expect(openSaveLayoutModal).toHaveBeenCalledTimes(2);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "S", ctrlKey: true }));
    expect(openSaveLayoutModal).toHaveBeenCalledTimes(3);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "s", metaKey: true }));
    expect(openSaveLayoutModal).toHaveBeenCalledTimes(4);
  });

  it("does not call openSaveLayoutModal if the events were fired from editable fields", () => {
    const wrapper = document.createElement("div");
    const openSaveLayoutModal = jest.fn();
    mount(
      <Context store={getStore()}>
        <GlobalKeyListener history={mockHistory} openSaveLayoutModal={openSaveLayoutModal} />
        <textarea id="some-text-area" />
      </Context>,
      { attachTo: wrapper }
    );

    const textarea = document.getElementById("some-text-area");
    if (!textarea) {
      throw new Error("Satisfy flow: textarea is not null.");
    }
    textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "s", ctrlKey: true }));
    expect(openSaveLayoutModal).toHaveBeenCalledTimes(0);
  });

  it("calls openLayoutModal after pressing cmd/ctrl + s/e keys", async () => {
    const wrapper = document.createElement("div");
    const openLayoutModal = jest.fn();
    mount(
      <Context store={getStore()}>
        <GlobalKeyListener history={mockHistory} openLayoutModal={openLayoutModal} />
      </Context>,
      { attachTo: wrapper }
    );

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "e", ctrlKey: true }));
    expect(openLayoutModal).toHaveBeenCalledTimes(1);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "E", metaKey: true }));
    expect(openLayoutModal).toHaveBeenCalledTimes(2);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "E", ctrlKey: true }));
    expect(openLayoutModal).toHaveBeenCalledTimes(3);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "e", metaKey: true }));
    expect(openLayoutModal).toHaveBeenCalledTimes(4);
  });

  it("does not call openLayoutModal if the events were fired from editable fields", () => {
    const wrapper = document.createElement("div");
    const openLayoutModal = jest.fn();
    mount(
      <Context store={getStore()}>
        <GlobalKeyListener history={mockHistory} openLayoutModal={openLayoutModal} />
        <textarea id="some-text-area" />
      </Context>,
      { attachTo: wrapper }
    );

    const textarea = document.getElementById("some-text-area");
    if (!textarea) {
      throw new Error("Satisfy flow: textarea is not null.");
    }
    textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "e", ctrlKey: true }));
    expect(openLayoutModal).toHaveBeenCalledTimes(0);
  });

  it("pushes shortcuts route to history after pressing cmd/ctrl + / keys", async () => {
    const wrapper = document.createElement("div");
    const mockHistoryPush = jest.fn();

    mount(
      <Context store={getStore()}>
        <GlobalKeyListener history={{ push: mockHistoryPush }} />
      </Context>,
      { attachTo: wrapper }
    );

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "/", ctrlKey: true }));
    expect(mockHistoryPush).toHaveBeenNthCalledWith(1, "/shortcuts");
  });

  it("pushes help route to history after pressing ?", async () => {
    const wrapper = document.createElement("div");
    const mockHistoryPush = jest.fn();

    mount(
      <Context store={getStore()}>
        <GlobalKeyListener history={{ push: mockHistoryPush }} />
      </Context>,
      { attachTo: wrapper }
    );

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "?" }));
    expect(mockHistoryPush).toHaveBeenNthCalledWith(1, "/help");
  });

  it("does not push shortcuts route if the events were fired from editable fields", () => {
    const wrapper = document.createElement("div");
    const mockHistoryPush = jest.fn();

    mount(
      <Context store={getStore()}>
        <GlobalKeyListener history={{ push: mockHistoryPush }} />
        <textarea id="some-text-area" />
      </Context>,
      { attachTo: wrapper }
    );

    const textarea = document.getElementById("some-text-area");
    if (!textarea) {
      throw new Error("Satisfy flow: textarea is not null.");
    }
    textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "?" }));
    expect(mockHistoryPush).not.toHaveBeenCalled();
  });
});
