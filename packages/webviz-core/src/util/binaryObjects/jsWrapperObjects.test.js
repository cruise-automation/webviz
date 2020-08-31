// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { definitions } from "./messageDefinitionUtils.test";
import { printClasses } from "webviz-core/src/util/binaryObjects/jsWrapperObjects";

describe("printClasses", () => {
  it("prints the expected function definition", () => {
    expect(printClasses(definitions)).toMatchSnapshot();
  });
});
