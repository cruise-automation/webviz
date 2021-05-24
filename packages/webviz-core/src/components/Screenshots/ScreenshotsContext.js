// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import domToImage from "dom-to-image-more-scroll-fix";
import React, { createContext, useCallback, useState } from "react";

import triggerFileDownload from "webviz-core/shared/triggerFileDownload";
import { useMessagePipeline } from "webviz-core/src/components/MessagePipeline";
import { PANEL_LAYOUT_ROOT_ID } from "webviz-core/src/util/globalConstants";
import { useGetCurrentValue } from "webviz-core/src/util/hooks";
import Logger from "webviz-core/src/util/Logger";
import sendNotification from "webviz-core/src/util/sendNotification";

const log = new Logger(__filename);
const PANEL_LAYOUT_ROOT_SELECTOR = `#${PANEL_LAYOUT_ROOT_ID}`;

export const ScreenshotsContext = createContext<{|
  downloadScreenshot: (elementToScreenshot: HTMLElement, fileName: string) => Promise<void>,
  copyScreenshotToClipboard: (elementToScreenshot: HTMLElement) => Promise<void>,
  takeScreenshot: () => Promise<?Blob>,
  isTakingScreenshot: boolean,
|}>({
  copyScreenshotToClipboard: () => {
    throw new Error("cannot take screenshot before initialization");
  },
  takeScreenshot: () => {
    throw new Error("cannot take screenshot before initialization");
  },
  downloadScreenshot: () => {
    throw new Error("cannot take screenshot before initialization");
  },
  isTakingScreenshot: false,
});

// Must be nested in the <PlayerManager>.
export function ScreenshotsProvider({ children }: { children: React$Node }) {
  const [isTakingScreenshot, setIsTakingScreenshot] = useState(false);

  const { pausePlayback } = useMessagePipeline(
    useCallback((messagePipeline) => ({ pausePlayback: messagePipeline.pausePlayback }), [])
  );

  const getIsTakingScreenshot = useGetCurrentValue(isTakingScreenshot);

  // Handles setting and restoring the isTakingScreenshot boolean before and after the captureFn runs
  const doScreenshotCapture = useCallback(async (captureFn: () => Promise<void>) => {
    if (getIsTakingScreenshot()) {
      return;
    }

    // We always pause playback when taking the screenshot.
    pausePlayback();
    setIsTakingScreenshot(true);

    try {
      return await captureFn();
    } catch (error) {
      log.error(error);
      sendNotification("Error taking screenshot", error.stack, "app", "error");
    } finally {
      setIsTakingScreenshot(false);
    }
  }, [getIsTakingScreenshot, pausePlayback]);

  const takeScreenshot = useCallback(async (elementToScreenshot?: HTMLElement): Promise<?Blob> => {
    const element = elementToScreenshot ?? document.querySelector(PANEL_LAYOUT_ROOT_SELECTOR);
    if (!element) {
      throw new Error(
        `Tried to take screenshot for comments but could not find element with selector ${PANEL_LAYOUT_ROOT_SELECTOR}`
      );
    }
    return doScreenshotCapture(() => domToImage.toBlob(element, { scrollFix: true }));
  }, [doScreenshotCapture]);

  const downloadScreenshot = useCallback(async (elementToScreenshot: HTMLElement, fileName: string) => {
    await doScreenshotCapture(async () => {
      try {
        const jpegUrl = await domToImage.toJpeg(elementToScreenshot, { scrollFix: true });
        triggerFileDownload(jpegUrl, fileName);
      } catch (error) {
        sendNotification("Failed to capture screnenshot as image file", error, "app", "error");
      }
    });
  }, [doScreenshotCapture]);

  const copyScreenshotToClipboard = useCallback(async (elementToScreenshot: HTMLElement) => {
    await doScreenshotCapture(async () => {
      try {
        const imageAsBlob = await takeScreenshot(elementToScreenshot);
        // $FlowFixMe - flow doesn't know about clipboard.write
        navigator.clipboard.write([new window.ClipboardItem({ "image/png": imageAsBlob })]);
      } catch (error) {
        sendNotification("Failed to copy image to clipboard", error, "app", "error");
      }
    });
  }, [doScreenshotCapture, takeScreenshot]);

  const contextValue = {
    takeScreenshot,
    downloadScreenshot,
    isTakingScreenshot,
    copyScreenshotToClipboard,
  };

  return <ScreenshotsContext.Provider value={contextValue}>{children}</ScreenshotsContext.Provider>;
}
