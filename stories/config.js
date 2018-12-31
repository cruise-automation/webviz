// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { addDecorator, configure } from "@storybook/react";
import { initScreenshot, setScreenshotOptions } from "storybook-chrome-screenshot";

import "webviz-core/src/styles/global.scss";
import prepareForScreenshots from "./prepareForScreenshots";
import waitForFonts from "webviz-core/src/styles/waitForFonts";
import installChartjs from "webviz-core/src/util/installChartjs";

global.GIT_INFO = {};
installChartjs();

addDecorator(initScreenshot());
setScreenshotOptions({
  delay: 100, // Small delay for rerenders that some components do.
  viewport: {
    width: 1001,
    height: 745,
  },
});
prepareForScreenshots();

// automatically import all files ending in *.stories.js
// $FlowFixMe - require.context seems not correctly typed.
const req = require.context("../packages", true, /\.stories\.js$/);
// $FlowFixMe - require.context seems not correctly typed.
const reqDocs = require.context("../docs", true, /\.stories\.js$/);

function loadStories() {
  req.keys().forEach((filename) => req(filename));
  reqDocs.keys().forEach((filename) => reqDocs(filename));
}

waitForFonts(() => {
  configure(loadStories, module);
});
