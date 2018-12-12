//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import babel from "rollup-plugin-babel";
import commonjs from "rollup-plugin-commonjs";
import resolve from "rollup-plugin-node-resolve";
import peerDepsExternal from "rollup-plugin-peer-deps-external";
import replace from "rollup-plugin-replace";

import pkg from "./package.json";

// Additional optitons applied on top of babel.config.js
const getBabelOptions = ({ useESModules }) => ({
  exclude: "**/node_modules/**",
  runtimeHelpers: true,
  plugins: [["@babel/transform-runtime", { useESModules }]],
});

const input = "src/index.js";
const libraryName = "ReglWorldview";

// HACK: add 'stream' field for styled-components SSR build.
// Another issue about loading multiple instances:
// https://www.styled-components.com/docs/faqs#why-am-i-getting-a-warning-about-several-instances-of-module-on-the-page
const globals = { react: "React", "react-dom": "ReactDOM", stream: "undefined" };
const isExternal = (id) => !id.startsWith(".") && !id.startsWith("/");

export default [
  {
    input,
    output: {
      file: "dist/index.umd.js",
      format: "iife", // Browser only
      name: libraryName,
      globals,
    },
    external: Object.keys(globals),
    plugins: [
      // Preferably set as first plugin.
      peerDepsExternal(),
      resolve({
        browser: true,
      }),
      babel(getBabelOptions({ useESModules: true })),
      commonjs({
        include: "node_modules/**",
        // Make styled components work: https://github.com/styled-components/styled-components/issues/1654
        namedExports: {
          "node_modules/react-is/index.js": ["isElement", "isValidElementType", "ForwardRef"],
        },
      }),
      replace({ "process.env.NODE_ENV": JSON.stringify("development") }),
    ],
  },
  {
    input,
    output: {
      file: pkg.main,
      format: "cjs",
      name: libraryName,
    },
    external: isExternal,
    plugins: [babel(getBabelOptions({ useESModules: false }))],
  },
  {
    input,
    output: {
      file: pkg.module,
      format: "es",
      name: libraryName,
    },
    external: isExternal,
    plugins: [babel(getBabelOptions({ useESModules: false }))],
  },
  // build types.js for easy grouping of type imports
  {
    input: "src/types/index.js",
    output: {
      file: "dist/types.js",
      format: "es",
      name: libraryName,
    },
    external: isExternal,
    plugins: [babel(getBabelOptions({ useESModules: false }))],
  },
];
