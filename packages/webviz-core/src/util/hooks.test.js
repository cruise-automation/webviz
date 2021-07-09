// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { renderHook } from "@testing-library/react-hooks";
import { mount } from "enzyme";
import React from "react";
import shallowequal from "shallowequal";

import {
  useChangeDetector,
  useDeepChangeDetector,
  useShallowMemo,
  useMustNotChange,
  useShouldNotChangeOften,
  createSelectableContext,
  useContextSelector,
  type SelectableContext,
  useReducedValue,
  useDeepMemo,
  type MemoResolver,
} from "./hooks";

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

describe("useDeepChangeDetector", () => {
  it("returns true only when value changes", () => {
    for (const initialValue of [true, false]) {
      const { result, rerender } = renderHook((deps) => useDeepChangeDetector(deps, initialValue), {
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

  it("uses deep comparison (lodash isEqual) for equality check", () => {
    const obj = { name: "foo" };
    const objInArr = { name: "bar" };
    const { result, rerender } = renderHook((deps) => useDeepChangeDetector(deps, false), {
      initialProps: [[1, objInArr], "a", obj],
    });
    expect(result.current).toBe(false);
    rerender([[1, objInArr], "a", obj]);
    expect(result.current).toBe(false);
    rerender([[1, { name: "bar" }], "a", { name: "foo" }]);
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

describe("useDeepMemo", () => {
  it("returns original object when deep equal", () => {
    let obj = { x: 1 };
    const { result, rerender } = renderHook((val) => useDeepMemo(val), { initialProps: obj });
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
    expect(result.current).toBe(obj);
    rerender(["abc", { x: 2 }]);
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

describe("useReducedValue", () => {
  it("returns a new state only when the input values have changed (deep comparison)", () => {
    const initialState = { name: "some name" };
    const mockFn = jest.fn();
    const input = ["foo", { name: "some other name" }];

    function reducer(prevState, currentInput) {
      const newState = currentInput.length ? { name: currentInput[0] } : prevState;
      mockFn(newState);
      return newState;
    }

    const { result, rerender } = renderHook((val) => useReducedValue(initialState, val, reducer), {
      initialProps: input,
    });
    rerender(input);
    expect(result.current).toEqual({ name: "some name" });
    rerender(["foo", { name: "some other name" }]);
    expect(result.current).toEqual({ name: "some name" });
    expect(mockFn).toHaveBeenCalledTimes(0);
    rerender(["bar", { name: "some other name" }]);
    expect(result.current).toEqual({ name: "bar" });
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
});

describe("useShouldNotChangeOften", () => {
  it("logs when value changes twice in a row", () => {
    const warn = jest.fn();
    const { result, rerender } = renderHook((val) => useShouldNotChangeOften(val, warn), { initialProps: "a" });
    function update(val) {
      rerender(val);
      expect(result.current).toBe(val);
    }
    update("a");
    update("a");
    update("b");
    update("b");
    update("c");
    expect(warn).not.toHaveBeenCalled();
    update("d");
    expect(warn).toHaveBeenCalled();
  });
});

describe("createSelectableContext/useContextSelector", () => {
  function createTestConsumer<T, U>(
    ctx: SelectableContext<T>,
    selector: (T) => U,
    options: ?{| memoResolver: MemoResolver<U> |}
  ) {
    function Consumer() {
      const value = useContextSelector(ctx, Consumer.selectorFn, options);
      return Consumer.renderFn(value);
    }
    Consumer.selectorFn = jest.fn().mockImplementation(selector);
    Consumer.renderFn = jest.fn().mockImplementation(() => null);
    return Consumer;
  }

  it("throws when selector is used outside a provider", () => {
    jest.spyOn(console, "error").mockReturnValue(); // Library logs an error.
    const C = createSelectableContext();
    const Consumer = createTestConsumer(C, (x) => x);

    expect(() => mount(<Consumer />)).toThrow("useContextSelector was used outside a corresponding <Provider />.");
  });

  it("throws when first selector call returns BAILOUT", () => {
    jest.spyOn(console, "error").mockReturnValue(); // Library logs an error.
    const C = createSelectableContext();
    const Consumer = createTestConsumer(C, () => useContextSelector.BAILOUT);

    expect(() =>
      mount(
        <C.Provider value={{}}>
          <Consumer />
        </C.Provider>
      )
    ).toThrow("Initial selector call must not return BAILOUT");
  });

  it("calls selector and render once with initial value", () => {
    const C = createSelectableContext();
    const Consumer = createTestConsumer(C, (x) => x);

    const root = mount(
      <C.Provider value={1}>
        <Consumer />
      </C.Provider>
    );

    root.update();
    root.update();

    expect(Consumer.selectorFn.mock.calls).toEqual([[1]]);
    expect(Consumer.renderFn.mock.calls).toEqual([[1]]);

    root.unmount();
  });

  it("re-renders when selector returns new value that isn't BAILOUT", () => {
    const C = createSelectableContext();
    const Consumer = createTestConsumer(C, ({ num }) => (num === 3 ? useContextSelector.BAILOUT : num));

    const root = mount(
      <C.Provider value={{ num: 1 }}>
        <Consumer />
      </C.Provider>
    );

    expect(Consumer.selectorFn.mock.calls).toEqual([[{ num: 1 }]]);
    expect(Consumer.renderFn.mock.calls).toEqual([[1]]);

    root.setProps({ value: { num: 1 } });
    expect(Consumer.selectorFn.mock.calls).toEqual([[{ num: 1 }], [{ num: 1 }]]);
    expect(Consumer.renderFn.mock.calls).toEqual([[1]]);

    root.setProps({ value: { num: 2 } });
    expect(Consumer.selectorFn.mock.calls).toEqual([[{ num: 1 }], [{ num: 1 }], [{ num: 2 }]]);
    expect(Consumer.renderFn.mock.calls).toEqual([[1], [2]]);

    // Selector returns BAILOUT, so no update should occur
    root.setProps({ value: { num: 3 } });
    expect(Consumer.selectorFn.mock.calls).toEqual([[{ num: 1 }], [{ num: 1 }], [{ num: 2 }], [{ num: 3 }]]);
    expect(Consumer.renderFn.mock.calls).toEqual([[1], [2]]);

    root.setProps({ value: { num: 4 } });
    expect(Consumer.selectorFn.mock.calls).toEqual([
      [{ num: 1 }],
      [{ num: 1 }],
      [{ num: 2 }],
      [{ num: 3 }],
      [{ num: 4 }],
    ]);
    expect(Consumer.renderFn.mock.calls).toEqual([[1], [2], [4]]);

    root.unmount();
  });

  it("propagates value to multiple consumers", () => {
    const C = createSelectableContext();
    const Consumer1 = createTestConsumer(C, ({ one }) => one);
    const Consumer2 = createTestConsumer(C, ({ two }) => two);

    const root = mount(
      <C.Provider value={{ one: 1, two: 2 }}>
        <Consumer1 />
        <div>
          <Consumer2 />
        </div>
      </C.Provider>
    );

    expect(Consumer1.selectorFn).toHaveBeenCalledTimes(1);
    expect(Consumer1.renderFn.mock.calls).toEqual([[1]]);
    expect(Consumer2.selectorFn).toHaveBeenCalledTimes(1);
    expect(Consumer2.renderFn.mock.calls).toEqual([[2]]);

    root.setProps({ value: { one: 1, two: 22 } });
    expect(Consumer1.selectorFn).toHaveBeenCalledTimes(2);
    expect(Consumer1.renderFn.mock.calls).toEqual([[1]]);
    expect(Consumer2.selectorFn).toHaveBeenCalledTimes(2);
    expect(Consumer2.renderFn.mock.calls).toEqual([[2], [22]]);

    root.setProps({ value: { one: 11, two: 22 } });
    expect(Consumer1.selectorFn).toHaveBeenCalledTimes(3);
    expect(Consumer1.renderFn.mock.calls).toEqual([[1], [11]]);
    expect(Consumer2.selectorFn).toHaveBeenCalledTimes(3);
    expect(Consumer2.renderFn.mock.calls).toEqual([[2], [22]]);

    root.unmount();
  });

  it("uses shallowequals when `enableShallowMemo` is set to true", () => {
    const C = createSelectableContext();
    const Consumer1 = createTestConsumer(C, ({ one }) => ({ one }), { memoResolver: shallowequal });
    const Consumer2 = createTestConsumer(C, ({ two }) => ({ two }), { memoResolver: shallowequal });

    const root = mount(
      <C.Provider value={{ one: 1, two: 2 }}>
        <Consumer1 />
        <div>
          <Consumer2 />
        </div>
      </C.Provider>
    );

    expect(Consumer1.selectorFn).toHaveBeenCalledTimes(1);
    expect(Consumer1.renderFn.mock.calls).toEqual([[{ one: 1 }]]);
    expect(Consumer2.selectorFn).toHaveBeenCalledTimes(1);
    expect(Consumer2.renderFn.mock.calls).toEqual([[{ two: 2 }]]);

    root.setProps({ value: { one: 1, two: 22 } });
    expect(Consumer1.selectorFn).toHaveBeenCalledTimes(2);
    expect(Consumer1.renderFn.mock.calls).toEqual([[{ one: 1 }]]);
    expect(Consumer2.selectorFn).toHaveBeenCalledTimes(2);
    expect(Consumer2.renderFn.mock.calls).toEqual([[{ two: 2 }], [{ two: 22 }]]);

    root.setProps({ value: { one: 11, two: 22 } });
    expect(Consumer1.selectorFn).toHaveBeenCalledTimes(3);
    expect(Consumer1.renderFn.mock.calls).toEqual([[{ one: 1 }], [{ one: 11 }]]);
    expect(Consumer2.selectorFn).toHaveBeenCalledTimes(3);
    expect(Consumer2.renderFn.mock.calls).toEqual([[{ two: 2 }], [{ two: 22 }]]);

    root.unmount();
  });

  it("doesn't call selector after unmount", () => {
    const C = createSelectableContext();
    const Consumer = createTestConsumer(C, ({ num }) => num);

    const root = mount(
      <C.Provider value={{ num: 1 }}>
        <Consumer />
      </C.Provider>
    );

    expect(Consumer.selectorFn.mock.calls).toEqual([[{ num: 1 }]]);
    expect(Consumer.renderFn.mock.calls).toEqual([[1]]);

    root.setProps({ children: null, value: { num: 2 } });
    expect(Consumer.selectorFn.mock.calls).toEqual([[{ num: 1 }], [{ num: 2 }]]);
    expect(Consumer.renderFn.mock.calls).toEqual([[1]]);

    root.setProps({ value: { num: 3 } });
    expect(Consumer.selectorFn.mock.calls).toEqual([[{ num: 1 }], [{ num: 2 }]]);
    expect(Consumer.renderFn.mock.calls).toEqual([[1]]);

    root.unmount();
  });

  it("batches updates when a component subscribes multiple times", () => {
    const C = createSelectableContext();

    const selector1 = jest.fn().mockImplementation(({ x }) => x);
    const selector2 = jest.fn().mockImplementation(({ y }) => y);
    const selector3 = jest.fn().mockImplementation(({ z }) => z);

    const renderFn = jest.fn().mockImplementation(() => null);

    function clearMocks() {
      selector1.mockClear();
      selector2.mockClear();
      selector3.mockClear();
      renderFn.mockClear();
    }

    function Test() {
      const x = useContextSelector(C, selector1);
      const y = useContextSelector(C, selector2);
      const z = useContextSelector(C, selector3);
      return renderFn([x, y, z]);
    }

    const root = mount(
      <C.Provider value={{ x: 0, y: 0, z: 0 }}>
        <Test />
      </C.Provider>
    );

    expect(selector1.mock.calls).toEqual([[{ x: 0, y: 0, z: 0 }]]);
    expect(selector2.mock.calls).toEqual([[{ x: 0, y: 0, z: 0 }]]);
    expect(selector3.mock.calls).toEqual([[{ x: 0, y: 0, z: 0 }]]);
    expect(renderFn.mock.calls).toEqual([[[0, 0, 0]]]);

    clearMocks();
    root.setProps({ value: { x: 1, y: 0, z: 0 } });
    expect(selector1.mock.calls).toEqual([[{ x: 1, y: 0, z: 0 }]]);
    expect(selector2.mock.calls).toEqual([[{ x: 1, y: 0, z: 0 }]]);
    expect(selector3.mock.calls).toEqual([[{ x: 1, y: 0, z: 0 }]]);
    expect(renderFn.mock.calls).toEqual([[[1, 0, 0]]]);

    clearMocks();
    root.setProps({ value: { x: 1, y: 2, z: 3 } });
    expect(selector1.mock.calls).toEqual([[{ x: 1, y: 2, z: 3 }]]);
    expect(selector2.mock.calls).toEqual([[{ x: 1, y: 2, z: 3 }]]);
    expect(selector3.mock.calls).toEqual([[{ x: 1, y: 2, z: 3 }]]);
    expect(renderFn.mock.calls).toEqual([[[1, 2, 3]]]);

    root.unmount();
  });

  it("works with function values", () => {
    const C = createSelectableContext();
    const Consumer = createTestConsumer(C, (x) => x);

    const fn1 = () => {
      throw new Error("should not be called");
    };
    const fn2 = () => {
      throw new Error("should not be called");
    };
    const root = mount(
      <C.Provider value={fn1}>
        <Consumer />
      </C.Provider>
    );

    root.setProps({ value: fn2 });

    expect(Consumer.selectorFn.mock.calls).toEqual([[fn1], [fn2]]);
    expect(Consumer.renderFn.mock.calls).toEqual([[fn1], [fn2]]);

    root.unmount();
  });
});
