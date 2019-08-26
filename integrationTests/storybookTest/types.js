// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

export type IntegrationTest = {|
  name: string,
  // Run in storybook context.
  story: (setTestData: (any) => void) => React$Element<any>,
  // Run in jest context, with access to puppeteer.
  test: (getTestData: () => Promise<any>) => Promise<void>,
|};

export type IntegrationTestModule = {|
  name: string,
  tests: Array<IntegrationTest>,
|};
