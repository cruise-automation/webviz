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
    "^.+\\.(js|jsx)$": "babel-jest",
    "^.+\\.ne$": "<rootDir>/jest/neTransform.js",
    "^(?!.*\\.(js|jsx|css|json)$)": "<rootDir>/jest/fileTransform.js",
  },
  moduleDirectories: ["<rootDir>/packages", "node_modules"],
  moduleFileExtensions: ["web.js", "js", "json", "web.jsx", "jsx", "node"],
  restoreMocks: true,
  setupFiles: [
    "<rootDir>/packages/webviz-core/src/test/setup.js",
    "<rootDir>/jest/configureEnzyme.js",
    "jest-canvas-mock",
  ],
  setupTestFrameworkScriptFile: "<rootDir>/packages/webviz-core/src/test/setupTestFramework.js",
  moduleNameMapper: {
    "worker-loader!./PngWorker.js": "<rootDir>/packages/webviz-core/src/test/MockWorker.js",
    "worker-loader!.*/UserNodePlayer/.+Worker":
      "<rootDir>/packages/webviz-core/src/players/UserNodePlayer/worker.mock.js",
    "\\.svg$": "<rootDir>/packages/webviz-core/src/test/MockSvg.js",
    "react-monaco-editor": "<rootDir>/packages/webviz-core/src/test/stubs/MonacoEditor.js",
    "\\.css$": "<rootDir>/jest/styleMock.js",
  },
};
