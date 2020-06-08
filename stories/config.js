// @flow
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { addDecorator, addParameters } from "@storybook/react";
import React from "react";
import { withScreenshot } from "storycap";

import "webviz-core/src/styles/global.scss";
import prepareForScreenshots from "./prepareForScreenshots";
import storiesSetup from "webviz-core/src/stories/setup";
import waitForFonts from "webviz-core/src/styles/waitForFonts";
import installChartjs from "webviz-core/src/util/installChartjs";

export const SCREENSHOT_VIEWPORT = {
  width: 1001,
  height: 745,
};

storiesSetup();
global.GIT_INFO = {};
installChartjs();

addDecorator((storyFn) => {
  document.querySelectorAll("[data-modalcontainer]").forEach((el) => el.remove()); // Remove leftover modals
  return React.createElement(storyFn);
});

addDecorator(withScreenshot);
addParameters({
  screenshot: {
    delay: 100,
    waitFor: waitForFonts,
    viewport: SCREENSHOT_VIEWPORT,
  },
});

prepareForScreenshots();

// automatically import all files ending in *.stories.js
// $FlowFixMe - require.context seems not correctly typed.
const req = require.context("../packages", true, /\.stories\.js$/);
// $FlowFixMe - require.context seems not correctly typed.
const reqDocs = require.context("../docs", true, /\.stories\.js$/);

// load the stories
req.keys().forEach((filename) => req(filename));
reqDocs.keys().forEach((filename) => reqDocs(filename));
