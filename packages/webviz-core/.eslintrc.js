// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
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
        patterns: ["client/*", "shared/*", "server/*"],
      },
    ],
    "no-restricted-modules": [
      "error",
      {
        patterns: ["client/*", "shared/*", "server/*"],
      },
    ],
    "header/header": [
      2,
      "line",
      [
        " @flow",
        "",
        {
          pattern: "^  Copyright \\(c\\) \\d{4}-present, GM Cruise LLC$",
          template: "  Copyright (c) 2019-present, GM Cruise LLC",
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
  },
};
