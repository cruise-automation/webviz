//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

const baseConfig = require("../babel.config");

module.exports = {
  ...baseConfig,
  plugins: baseConfig.plugins.filter((plugin) => plugin !== "@babel/plugin-transform-modules-commonjs"),
};
