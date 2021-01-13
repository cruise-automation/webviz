// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import domToImage from "dom-to-image-more-scroll-fix";
import { mount } from "enzyme";
import { noop } from "lodash";
import React, { useContext } from "react";
import { act } from "react-dom/test-utils";

import { ScreenshotsProvider, ScreenshotsContext } from "./ScreenshotsProvider";
import delay from "webviz-core/shared/delay";
import signal from "webviz-core/shared/signal";
import { MockMessagePipelineProvider } from "webviz-core/src/components/MessagePipeline";
import sendNotification from "webviz-core/src/util/sendNotification";

const defaultContext = {
  takeScreenshot: noop,
  isTakingScreenshot: false,
};

jest.mock("dom-to-image-more-scroll-fix", () => ({ toBlob: jest.fn() }));

function ScreenshotConsumer({ context }: { context: any }) {
  const screenshotContext = useContext(ScreenshotsContext);
  Object.entries(screenshotContext).forEach(([key, value]) => {
    context[key] = value;
  });
  return null;
}

describe("ScreenshotsProvider", () => {
  it("works correctly with a valid element", async () => {
    const blob = new Blob();
    const resolveSignal = signal();
    domToImage.toBlob.mockReturnValueOnce(resolveSignal);
    const context = { ...defaultContext };
    const pausePlayback = jest.fn();
    mount(
      <MockMessagePipelineProvider pausePlayback={pausePlayback}>
        <ScreenshotsProvider>
          <ScreenshotConsumer context={context} />
        </ScreenshotsProvider>
      </MockMessagePipelineProvider>
    );
    expect(context.isTakingScreenshot).toEqual(false);
    expect(pausePlayback).not.toHaveBeenCalled();

    const element = document.createElement("div");
    await act(async () => {
      const returnedPromise = context.takeScreenshot(element);
      await delay(10);
      expect(context.isTakingScreenshot).toEqual(true);
      expect(pausePlayback).toHaveBeenCalled();

      resolveSignal.resolve(blob);
      const returnValue = await returnedPromise;
      expect(returnValue).toEqual(blob);
      expect(domToImage.toBlob).toHaveBeenCalledWith(element, { scrollFix: true });
      expect(context.isTakingScreenshot).toEqual(false);
    });
  });

  it("handles a dom-to-image error correctly", async () => {
    const context = { ...defaultContext };
    mount(
      <MockMessagePipelineProvider>
        <ScreenshotsProvider>
          <ScreenshotConsumer context={context} />
        </ScreenshotsProvider>
      </MockMessagePipelineProvider>
    );

    domToImage.toBlob.mockImplementationOnce(() => {
      return Promise.reject("Dummy error");
    });
    const element = document.createElement("div");
    await act(async () => {
      const returnedPromise = context.takeScreenshot(element);

      const returnValue = await returnedPromise;
      expect(returnValue).toEqual(undefined);
      expect(context.isTakingScreenshot).toEqual(false);
      sendNotification.expectCalledDuringTest();
    });
  });
});
