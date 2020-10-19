// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { getLayoutFolder } from "./layout";

describe("getLayoutFolder", () => {
  it("works for empty and missing folder names", () => {
    expect(getLayoutFolder()).toBe("");
    expect(getLayoutFolder("")).toBe("");
  });

  it("returns the namespace and folder name for matching folders", () => {
    expect(getLayoutFolder("private/ryan/My layout@with/funny#characters")).toBe("private/ryan");
  });
});
