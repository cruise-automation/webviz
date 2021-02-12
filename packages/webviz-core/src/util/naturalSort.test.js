// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import naturalSort from "webviz-core/src/util/naturalSort";

describe("naturalSort", () => {
  it("sorts case insensitively", () => {
    expect(["c", "B", "a"].sort(naturalSort())).toEqual(["a", "B", "c"]);
  });

  it("can sort using a key", () => {
    expect([{ name: "c" }, { name: "B" }, { name: "a" }].sort(naturalSort("name"))).toEqual([
      { name: "a" },
      { name: "B" },
      { name: "c" },
    ]);
  });
});
