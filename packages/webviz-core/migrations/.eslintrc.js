// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
const fs = require("fs");
const path = require("path");

const getRestrictedDirectories = (source) =>
  fs
    .readdirSync(source)
    .map((name) => path.join(source, name))
    .filter((eachSource) => fs.lstatSync(eachSource).isDirectory())
    .filter((dirPath) => dirPath !== "webviz-core/migrations");

module.exports = {
  rules: {
    "no-restricted-imports": [
      "error",
      {
        paths: [
          { name: "lodash", importNames: ["get"], message: "Use optional chaining instead of lodash.get." },
          { name: "lodash/get", message: "Use optional chaining instead of lodash.get." },
        ],
        patterns: ["client/*", "shared/*", "server/*", ...getRestrictedDirectories(path.join(__dirname, "../"))],
      },
    ],
  },
  overrides: [{ files: ["*.test.js"], rules: { "no-restricted-imports": 0 } }],
};
