// @flow
//
//  Copyright (c) 2021-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import createExpressionEvaluator from "webviz-core/src/util/expressionEval";

describe("createExpressionEvaluator", () => {
  it("evaluates expressions", () => {
    const evaluatorFn = createExpressionEvaluator("val + 2");
    expect(evaluatorFn({ val: 1 })).toBe(3);
  });

  it("does not throw errors for invalid expressions", () => {
    const evaluatorFn = createExpressionEvaluator("@!?");
    expect(evaluatorFn).toBeUndefined();
  });

  it("evaluates JS boolean expressions", () => {
    expect(createExpressionEvaluator("foo && bar")({ foo: true, bar: true })).toBe(true);
    expect(createExpressionEvaluator("foo && bar")({ foo: false, bar: true })).toBe(false);
    expect(createExpressionEvaluator("foo || bar")({ foo: false, bar: true })).toBe(true);
    expect(createExpressionEvaluator("foo || bar")({ foo: false, bar: false })).toBe(false);
    expect(createExpressionEvaluator("foo&&bar||qux")({ foo: false, bar: false, qux: true })).toBe(true);
  });
});
