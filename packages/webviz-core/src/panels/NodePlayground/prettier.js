// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// Takes in a string of Typescript code and returns
// beautified, formatted string of Typescript code
async function getPrettifiedCode(code: string): Promise<string> {
  let prettier, parserPlugin;

  // Dynamic imports don't work in node-based jest tests, so require() them instead
  if (process.env.NODE_ENV === "test") {
    prettier = require("prettier/standalone");
    parserPlugin = require("prettier/parser-typescript");
  } else {
    prettier = await import(/* webpackChunkName: "prettier" */ "prettier/standalone");
    parserPlugin = await import(/* webpackChunkName: "prettier" */ "prettier/parser-typescript");
  }

  return prettier.format(code, { parser: "typescript", plugins: [parserPlugin] });
}

export default getPrettifiedCode;
