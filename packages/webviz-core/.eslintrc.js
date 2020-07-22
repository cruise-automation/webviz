// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

module.exports = {
  plugins: ["header", "react-hooks"],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        paths: [
          { name: "lodash", importNames: ["get"], message: "Use optional chaining instead of lodash.get." },
          { name: "lodash/get", message: "Use optional chaining instead of lodash.get." },
        ],
        patterns: ["client/*", "shared/*", "server/*", "webviz-core/migrations", "webviz-core/migrations/*"],
      },
    ],
    "no-restricted-modules": [
      "error",
      { patterns: ["client/*", "shared/*", "server/*", "webviz-core/migrations", "webviz-core/migrations/*"] },
    ],
    "no-shadow": "error",
    "no-restricted-syntax": [
      "error",
      {
        selector: "MethodDefinition[kind='get'], Property[kind='get']",
        message: "Property getters are not allowed; prefer function syntax instead.",
      },
      {
        selector: "MethodDefinition[kind='set'], Property[kind='set']",
        message: "Property setters are not allowed; prefer function syntax instead.",
      },
    ],
    "header/header": [
      2,
      "line",
      [
        " @flow",
        "",
        {
          pattern: "^  Copyright \\(c\\) \\d{4}-present, Cruise LLC$",
          template: "  Copyright (c) 2020-present, Cruise LLC",
        },
        "",
        "  This source code is licensed under the Apache License, Version 2.0,",
        "  found in the LICENSE file in the root directory of this source tree.",
        "  You may not use this file except in compliance with the License.",
      ],
    ],
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "error",
    "no-console": "off",
    "no-unused-vars": ["error", { vars: "all", args: "after-used", varsIgnorePattern: "^_", argsIgnorePattern: "^_" }],
  },
};
