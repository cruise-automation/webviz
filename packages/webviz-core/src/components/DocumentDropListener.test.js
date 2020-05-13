// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { noop } from "lodash";
import * as React from "react";
import ReactDOM from "react-dom";

import DocumentDropListener from "webviz-core/src/components/DocumentDropListener";

describe("<DocumentDropListener>", () => {
  let wrapper, windowDragoverHandler;

  beforeEach(() => {
    windowDragoverHandler = jest.fn();
    window.addEventListener("dragover", windowDragoverHandler);

    wrapper = document.createElement("div");
    if (document.body) {
      document.body.appendChild(wrapper);
    }

    ReactDOM.render(
      <div>
        <DocumentDropListener filesSelected={noop}>
          <div />
        </DocumentDropListener>
      </div>,
      wrapper
    );
  });

  it("allows the event to bubble if the dataTransfer has no files", async () => {
    // The event should bubble up from the document to the window
    document.dispatchEvent(new CustomEvent("dragover", { target: document.body, bubbles: true, cancelable: true }));
    expect(windowDragoverHandler).toHaveBeenCalled();
  });

  it("prevents the event from bubbling if the dataTransfer contains Files", async () => {
    // DragEvent is not defined in jsdom at the moment, so simulate one using a MouseEvent
    const event: any = new MouseEvent("dragover", {
      target: document.body,
      bubbles: true,
      cancelable: true,
    });
    event.dataTransfer = {
      types: ["Files"],
    };
    document.dispatchEvent(event); // The event should NOT bubble up from the document to the window
    expect(windowDragoverHandler).not.toHaveBeenCalled();
  });

  afterEach(() => {
    if (document.body) {
      document.body.removeChild(wrapper);
    }
    window.removeEventListener("dragover", windowDragoverHandler);
  });
});
