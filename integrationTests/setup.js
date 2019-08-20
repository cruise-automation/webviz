// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { setDefaultOptions } from "expect-puppeteer";
import type { Page } from "puppeteer";

jest.setTimeout(60 * 1000);
setDefaultOptions({ timeout: 60 * 1000 });

// Pass browser console through.
declare var page: Page;
page.on("console", (msg) => {
  if (process.env.SHOW_TEST_OUTPUT) {
    console.log(`[page ${msg.type()}]`, msg.text());
  }
});

require("../jest/setupTestFramework.js");
