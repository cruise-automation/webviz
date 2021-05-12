// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import domToImage from "dom-to-image-more-scroll-fix";
import React, { createContext, useCallback, useState } from "react";

import { useMessagePipeline } from "webviz-core/src/components/MessagePipeline";
import { PANEL_LAYOUT_ROOT_ID } from "webviz-core/src/util/globalConstants";
import { useGetCurrentValue } from "webviz-core/src/util/hooks";
import Logger from "webviz-core/src/util/Logger";
import sendNotification from "webviz-core/src/util/sendNotification";

const log = new Logger(__filename);

export const ScreenshotsContext = createContext<{|
  takeScreenshot: () => Promise<?Blob>,
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

  const { pausePlayback } = useMessagePipeline(
    useCallback((messagePipeline) => ({ pausePlayback: messagePipeline.pausePlayback }), [])
  );

  const getIsTakingScreenshot = useGetCurrentValue(isTakingScreenshot);

  const takeScreenshot = useCallback(async (): Promise<?Blob> => {
    if (getIsTakingScreenshot()) {
      return;
    }
    const selector = `#${PANEL_LAYOUT_ROOT_ID}`;
    const element = document.querySelector(selector);
    if (!element) {
      throw new Error(`Tried to take screenshot for comments but could not find element with selector ${selector}`);
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
  }, [getIsTakingScreenshot, pausePlayback]);

  const contextValue = {
    takeScreenshot,
    isTakingScreenshot,
  };

  return <ScreenshotsContext.Provider value={contextValue}>{children}</ScreenshotsContext.Provider>;
}
