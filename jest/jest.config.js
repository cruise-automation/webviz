// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

module.exports = {
  rootDir: "..",
  testMatch: ["**/*.test.js"],
  testURL: "http://localhost",
  transform: {
    "^.+\\.(js|jsx)$": "<rootDir>/jest/jsTransform.js",
    "^.+\\.css$": "<rootDir>/jest/cssTransform.js",
    "^(?!.*\\.(js|jsx|css|json)$)": "<rootDir>/jest/fileTransform.js",
  },
  moduleDirectories: ["<rootDir>/packages", "node_modules"],
  moduleFileExtensions: ["web.js", "js", "json", "web.jsx", "jsx", "node"],
  resetMocks: true,
  setupFiles: ["<rootDir>/jest/configureEnzyme.js"],
};
