// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";

import allTestModules from "./allTestModules";

/*
 * This module reads from all integration test modules and automatically generate storybook stories from them.
 * DO NOT ADD STORIES DIRECTLY TO THIS MODULE.
 * Instead add integration test modules to the `allTestModules` package.
 */

// Use window.parent, because tests are wrapped in iframes.
const globalObject = window.parent ? window.parent : window;

globalObject.testData = {};

// Sets test data on the global object so that it can be read later from puppeteer tests.
const setTestData = (testName) => (testData) => {
  globalObject.testData[testName] = testData;
};

for (const testModule of allTestModules) {
  // Prefix all stories with "Integration/" so that we don't run into name conflicts.
  const stories = storiesOf(`Integration/${testModule.name}`, module);
  for (const integrationTest of testModule.tests) {
    // Give each test a namespace to store data so that it can't pollute from one test to another.
    const testScopedSetTestData = setTestData(integrationTest.name);
    stories.add(integrationTest.name, () => integrationTest.story(testScopedSetTestData));
  }
}
