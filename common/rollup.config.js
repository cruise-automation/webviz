//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import wasm from "@rollup/plugin-wasm";
import babel from "rollup-plugin-babel";
import commonjs from "rollup-plugin-commonjs";
import copy from "rollup-plugin-copy";
import resolve from "rollup-plugin-node-resolve";
import peerDepsExternal from "rollup-plugin-peer-deps-external";
import replace from "rollup-plugin-replace";
import { terser } from "rollup-plugin-terser";

// Additional options applied on top of babel.config.js
const getBabelOptions = ({ useESModules }) => ({
  exclude: "**/node_modules/**",
  runtimeHelpers: true,
  plugins: [
    ["@babel/transform-runtime", { useESModules }],
    ["@babel/plugin-proposal-object-rest-spread", { useBuiltIns: true }],
  ],
});

const input = "src/index.js";
const libraryName = "ReglWorldview";

const globals = { react: "React", "react-dom": "ReactDOM" };
const isExternal = (id) => !id.startsWith(".") && !id.startsWith("/");

export default function(pkg) {
  return [
    {
      input,
      output: {
        file: "dist/index.umd.js",
        format: "iife", // Browser only
        name: libraryName,
        globals,
        sourcemap: true,
      },
      external: Object.keys(globals),
      plugins: [
        // Preferably set as first plugin.
        peerDepsExternal(),
        resolve({
          browser: true,
        }),
        babel(getBabelOptions({ useESModules: true })),
        commonjs({ include: "node_modules/**" }),
        replace({ "process.env.NODE_ENV": JSON.stringify("development") }),
        terser(),
        wasm(),
      ],
    },
    {
      input,
      output: {
        file: pkg.main,
        format: "cjs",
        name: libraryName,
        sourcemap: true,
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
        sourcemap: true,
      },
      external: isExternal,
      plugins: [
        babel(getBabelOptions({ useESModules: false })),
        copy({
          "flow/index.js.flow": "dist/index.js.flow",
        }),
      ],
    },
  ];
}
