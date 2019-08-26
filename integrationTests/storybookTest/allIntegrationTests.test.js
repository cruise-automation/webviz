// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { Page } from "puppeteer";

import allTestModules from "./allTestModules";

declare var page: Page;

/*
 * This module reads from all integration test modules and automatically generate jest/puppeteer tests from them.
 * DO NOT ADD TESTS DIRECTLY TO THIS MODULE.
 * Instead add integration test modules to the `allTestModules` package.
 */

function getPageName(moduleName: string, testName: string) {
  return `http://localhost:6006/iframe.html?selectedKind=Integration/${moduleName}&selectedStory=${testName}`;
}

const getTestData = async (testName) => {
  // Add some time to ensure that the hitmap has time to render/read.
  await page.waitFor(50);
  const executionContext = await page.mainFrame().executionContext();
  return executionContext.evaluate(`window.testData["${testName}"]`);
};

for (const testModule of allTestModules) {
  // eslint-disable-next-line jest/valid-describe
  describe(testModule.name, () => {
    // Check to ensure that there are no test name overlaps - if there are, the stories will overwrite each other.
    const allTestNames = testModule.tests.map(({ name }) => name);
    if (new Set(allTestNames).size !== allTestNames.length) {
      throw new Error(`Some tests in ${testModule.name} have overlapping names`);
    }

    for (const integrationTest of testModule.tests) {
      it(integrationTest.name, async () => {
        // Ensure that there are no errors thrown or logged on the page.
        const errors = [];
        const consoleErrorCallback = (e) => {
          if (e.type() === "error") {
            errors.push(e.text());
          }
        };
        const pageErrorCallback = (e) => {
          errors.push(e.message);
        };
        page.on("console", consoleErrorCallback);
        page.on("pageerror", pageErrorCallback);

        const pageName = getPageName(testModule.name, integrationTest.name);
        await page.goto(pageName);
        // Give each test a namespace to store data so that it can't pollute from one test to another.
        await integrationTest.test(async () => getTestData(integrationTest.name));

        expect(errors).toEqual([]);
        page.removeListener("console", consoleErrorCallback);
        page.removeListener("pageerror", pageErrorCallback);
      });
    }
  });
}
