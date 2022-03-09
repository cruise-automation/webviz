// @flow
//
//  Copyright (c) 2021-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import LabelGenerator from "webviz-core/src/util/incrementingLabels";

describe("LabelGenerator", () => {
  it("returns things unchanged when no conflicts are present", () => {
    const emptyGenerator = new LabelGenerator();
    expect(emptyGenerator.suggestLabel("asdf")).toBe("asdf");
    expect(emptyGenerator.suggestLabel("asdf(0)")).toBe("asdf(0)");
    expect(emptyGenerator.suggestLabel("asdf(10)")).toBe("asdf(10)");

    const nonemptyGenerator = new LabelGenerator(["asdf", "qwer(0)", "zxcv(2)", "zxcv(10)"]);
    expect(nonemptyGenerator.suggestLabel("asdf(10)")).toBe("asdf(10)");
    expect(nonemptyGenerator.suggestLabel("qwer(2)")).toBe("qwer(2)");
    expect(nonemptyGenerator.suggestLabel("zxcv")).toBe("zxcv");
    expect(nonemptyGenerator.suggestLabel("zxcv(1)")).toBe("zxcv(1)");
    expect(nonemptyGenerator.suggestLabel("zxcv(5)")).toBe("zxcv(5)");
  });

  it("returns suggestions when there are conflicts", () => {
    const nonemptyGenerator = new LabelGenerator(["asdf", "qwer(0)", "zxcv(2)", "zxcv(10)"]);
    expect(nonemptyGenerator.suggestLabel("qwer")).toBe("qwer(1)");
    expect(nonemptyGenerator.suggestLabel("asdf")).toBe("asdf(1)");
    expect(nonemptyGenerator.suggestLabel("asdf(0)")).toBe("asdf(1)");
    expect(nonemptyGenerator.suggestLabel("zxcv(2)")).toBe("zxcv(11)");
  });
});
