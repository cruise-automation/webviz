// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import inScreenshotTests from "./inScreenshotTests";

function prepareForScreenshots() {
  if (inScreenshotTests()) {
    // We have some animations here and there. Disable them for screenshots.
    // Per https://github.com/tsuyoshiwada/storybook-chrome-screenshot#disable-component-animation
    const style = document.createElement("style");
    style.innerHTML = `* {
      transition: none !important;
      animation: none !important;
      caret-color: transparent !important;
    }`;
    if (document.body) {
      document.body.appendChild(style);
    }
  }
}

export default prepareForScreenshots;
