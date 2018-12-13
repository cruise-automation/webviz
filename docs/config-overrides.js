//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

const { getBabelLoader } = require("react-app-rewired");

module.exports = (config, _env) => {
  const babelLoader = getBabelLoader(config.module.rules);
  config.module.rules.map((rule) => {
    if (typeof rule.test !== "undefined" || typeof rule.oneOf === "undefined") {
      return rule;
    }

    rule.oneOf.unshift({
      test: /\.mdx?$/,
      use: [
        {
          loader: babelLoader.loader,
          options: babelLoader.options,
        },
        "@mdx-js/loader",
      ],
    });

    return rule;
  });

  return config;
};
