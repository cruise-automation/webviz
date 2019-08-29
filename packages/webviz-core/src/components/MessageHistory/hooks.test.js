// @flow
//
//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { renderHook } from "@testing-library/react-hooks";

import { useChangeDetector, useShallowMemo, useMustNotChange, useShouldNotChangeOften } from "./hooks";

describe("useChangeDetector", () => {
  it("returns true only when value changes", () => {
    for (const initialValue of [true, false]) {
      const { result, rerender } = renderHook((deps) => useChangeDetector(deps, initialValue), {
        initialProps: [1, 1],
      });
      expect(result.current).toBe(initialValue);
      rerender([1, 1]);
      expect(result.current).toBe(false);
      rerender([2, 1]);
      expect(result.current).toBe(true);
      rerender([2, 1]);
      expect(result.current).toBe(false);
      rerender([2, 2]);
      expect(result.current).toBe(true);
      rerender([2, 2]);
      expect(result.current).toBe(false);
    }
  });

  it("uses reference equality", () => {
    const obj = {};
    const { result, rerender } = renderHook((deps) => useChangeDetector(deps, false), { initialProps: [1, "a", obj] });
    expect(result.current).toBe(false);
    rerender([1, "a", obj]);
    expect(result.current).toBe(false);
    rerender([1, "a", {}]);
    expect(result.current).toBe(true);
    rerender([1, "a", obj]);
    expect(result.current).toBe(true);
    rerender([1, "a", obj]);
    expect(result.current).toBe(false);
  });
});

describe("useShallowMemo", () => {
  it("returns original object when shallowly equal", () => {
    let obj = { x: 1 };
    const { result, rerender } = renderHook((val) => useShallowMemo(val), { initialProps: obj });
    expect(result.current).toBe(obj);
    rerender({ x: 1 });
    expect(result.current).toBe(obj);

    obj = ["abc", 123];
    rerender(obj);
    expect(result.current).toBe(obj);
    rerender(["abc", 123]);
    expect(result.current).toBe(obj);

    obj = ["abc", { x: 1 }];
    rerender(obj);
    expect(result.current).toBe(obj);
    rerender(["abc", { x: 1 }]);
    expect(result.current).not.toBe(obj);
  });
});

describe("useMustNotChange", () => {
  it("throws when value changes", () => {
    const { result, rerender } = renderHook((val) => useMustNotChange(val, "hi"), { initialProps: 1 });
    rerender(1);
    expect(result.current).toBe(1);
    rerender("1");
    expect(result.error).toEqual(new Error('hi\nOld: 1\nNew: "1"'));
  });
});

describe("useShouldNotChangeOften", () => {
  it("logs when value changes twice in a row", () => {
    const warn = jest.spyOn(console, "warn").mockReturnValue();
    const { result, rerender } = renderHook((val) => useShouldNotChangeOften(val, "hi"), { initialProps: "a" });
    function update(val) {
      rerender(val);
      expect(result.current).toBe(val);
    }
    update("a");
    update("a");
    update("b");
    update("b");
    update("c");
    expect(warn.mock.calls).toEqual([]);
    update("d");
    expect(warn.mock.calls).toEqual([["hi"]]);
    warn.mockRestore();
  });
});
