//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        modules: false,
      },
    ],
    '@babel/preset-react',
    '@babel/preset-flow',
  ],
  plugins: [
    // jest requires the es5 transform to work
    process.env.NODE_ENV === 'test' ? 'transform-es2015-modules-commonjs' : undefined,
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-export-default-from',
  ].filter(Boolean),
  ignore: ['node_modules/**'],
};
