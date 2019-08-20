// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

process.env.JEST_PUPPETEER_CONFIG = `${__dirname}/puppeteerConfig.js`;

module.exports = {
  preset: "jest-puppeteer",
  rootDir: "..",
  testMatch: ["<rootDir>/integrationTests/**/*.test.js"],
  moduleDirectories: ["<rootDir>", "node_modules"],
  setupTestFrameworkScriptFile: "<rootDir>/integrationTests/setup.js",
  resetMocks: true,
};
