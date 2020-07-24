// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

export default () => {
  global.File = class MockFile {
    name: string;
    constructor(parts: any, name: string) {
      this.name = name;
    }
  };
};
