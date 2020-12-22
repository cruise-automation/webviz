// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import domToImage from "dom-to-image-more-scroll-fix";
import React, { createContext, useCallback, useState, useRef } from "react";

import { useMessagePipeline } from "webviz-core/src/components/MessagePipeline";
import Logger from "webviz-core/src/util/Logger";
import sendNotification from "webviz-core/src/util/sendNotification";

const log = new Logger(__filename);

export const ScreenshotsContext = createContext<{|
  takeScreenshot: (element: HTMLElement) => Promise<?Blob>,
  isTakingScreenshot: boolean,
|}>({
  takeScreenshot: () => {
    throw new Error("cannot take screenshot before initialization");
  },
  isTakingScreenshot: false,
});

// Must be nested in the <PlayerManager>.
export function ScreenshotsProvider({ children }: { children: React$Node }) {
  const [isTakingScreenshot, setIsTakingScreenshot] = useState(false);

  const pausePlayback = useMessagePipeline(useCallback((messagePipeline) => messagePipeline.pausePlayback, []));

  // Use an additional ref here because we never want these callbacks to change.
  const isTakingScreenshotRef = useRef(isTakingScreenshot);
  isTakingScreenshotRef.current = isTakingScreenshot;

  const takeScreenshot = useCallback(async (element: HTMLElement): Promise<?Blob> => {
    if (isTakingScreenshotRef.current) {
      return;
    }

    // We always pause playback when taking the screenshot.
    pausePlayback();
    setIsTakingScreenshot(true);

    let image;
    try {
      image = await domToImage.toBlob(element, { scrollFix: true });
    } catch (error) {
      log.error(error);
      sendNotification("Error taking screenshot", error.stack, "app", "error");
    } finally {
      setIsTakingScreenshot(false);
    }
    return image;
  }, [pausePlayback]);

  const contextValue = {
    takeScreenshot,
    isTakingScreenshot,
  };

  return <ScreenshotsContext.Provider value={contextValue}>{children}</ScreenshotsContext.Provider>;
}
