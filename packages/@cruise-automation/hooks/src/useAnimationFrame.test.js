// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { renderHook } from "react-hooks-testing-library";

import useAnimationFrame from "./useAnimationFrame";

const MOCK_TIMESTAMP = 10336878.725;

describe("useAnimationFrame", () => {
  let rafExecutionCount = 0;
  let maxExecutionCount = 3;
  let count = 0;
  function cb() {
    count += 1;
  }

  beforeEach(() => {
    count = 0;
    rafExecutionCount = 0;
    maxExecutionCount = 3;
    jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      if (rafExecutionCount < maxExecutionCount) {
        rafExecutionCount++;
        return cb(MOCK_TIMESTAMP);
      }
    });
  });

  afterEach(() => {
    window.requestAnimationFrame.mockRestore();
  });

  it("calls the callback with timestamp upon each animation frame", () => {
    maxExecutionCount = 1;
    const mockCb = jest.fn((x) => undefined);
    renderHook(() => useAnimationFrame(mockCb, false, []));
    expect(mockCb.mock.calls.length).toBe(1);
    expect(mockCb.mock.calls[0][0]).toBe(MOCK_TIMESTAMP);
  });

  it("doesn't call the callback if it's disabled", () => {
    renderHook(() => useAnimationFrame(cb, true, []));
    expect(count).toBe(0);
  });

  it("stops and continues to execute when disable and dependencies change", () => {
    const { rerender } = renderHook(({ disable, dependencies }) => useAnimationFrame(cb, disable, dependencies), {
      initialProps: { disable: false, dependencies: [1] },
    });
    expect(count).toBe(3);

    // stop execution when disable is true
    maxExecutionCount = 6;
    rerender({ disable: true, dependencies: [1] });
    expect(count).toBe(3);
    expect(rafExecutionCount).toBe(3);

    // continue the execution when disable changed to false
    maxExecutionCount = 6;
    rerender({ disable: false, dependencies: [1] });
    expect(count).toBe(6);
    expect(rafExecutionCount).toBe(6);

    // continue the execution if the dependencies have changed
    maxExecutionCount = 9;
    rerender({ disable: false, dependencies: [2] });
    expect(count).toBe(9);
    expect(rafExecutionCount).toBe(9);
  });
});
