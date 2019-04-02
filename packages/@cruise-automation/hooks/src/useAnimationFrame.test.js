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
  let maxExecutionCounnt = 3;
  let count = 0;
  function cb() {
    count += 1;
  }

  beforeEach(() => {
    count = 0;
    rafExecutionCount = 0;
    jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      if (rafExecutionCount < maxExecutionCounnt) {
        rafExecutionCount++;
        return cb(MOCK_TIMESTAMP);
      }
    });
  });

  afterEach(() => {
    window.requestAnimationFrame.mockRestore();
  });

  it("call the callback at each requestAnimationFrame", () => {
    renderHook(() => useAnimationFrame(cb, false, []));
    expect(count).toBe(3);
  });

  it("calls the callback with timestamp", () => {
    let timestamp = "";
    function cbWithTimestamp(ts) {
      timestamp = ts;
    }
    renderHook(() => useAnimationFrame(cbWithTimestamp, false, []));
    expect(timestamp).toBe(MOCK_TIMESTAMP);
  });

  it("doesn't call the callback if it's disabled", () => {
    renderHook(() => useAnimationFrame(cb, true, []));
    expect(count).toBe(0);
  });

  it("can stop and continue to execute when disable and dependency changes", () => {
    let input = [1];
    const { rerender } = renderHook(() => useAnimationFrame(cb, false, input));
    expect(count).toBe(3);

    // stop execution when disable is true
    maxExecutionCounnt = 6;
    rerender(cb, true, [cb, true, 1]);
    expect(count).toBe(3);
    expect(rafExecutionCount).toBe(3);

    // continue the execution when disable is false and dependencies have changed
    maxExecutionCounnt = 6;
    input = [2];
    rerender(cb, false, input);
    expect(count).toBe(6);
    expect(rafExecutionCount).toBe(6);
  });
});
