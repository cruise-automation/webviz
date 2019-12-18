// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import debouncePromise from "./debouncePromise";
import signal from "webviz-core/shared/signal";

/* eslint-disable jest/valid-expect-in-promise */

describe("debouncePromise", () => {
  it("debounces with resolved and rejected promises", async () => {
    const promises = [Promise.resolve(), Promise.reject(), Promise.reject(), Promise.resolve()];

    let calls = 0;
    const debouncedFn = debouncePromise(() => {
      ++calls;
      return promises.shift();
    });

    expect(calls).toBe(0);

    debouncedFn();
    debouncedFn();
    debouncedFn();
    debouncedFn();
    expect(calls).toBe(1);

    await Promise.resolve();
    expect(calls).toBe(2);
    expect(debouncedFn.currentPromise).toBeUndefined();

    debouncedFn();
    expect(calls).toBe(3);
    expect(debouncedFn.currentPromise).toBeDefined();

    debouncedFn();
    expect(calls).toBe(3);
    await Promise.resolve();
    expect(calls).toBe(4);
    expect(debouncedFn.currentPromise).toBeUndefined();
    expect(promises).toHaveLength(0);
  });

  it("provides currentPromise to wait on the current call", async () => {
    expect.assertions(5);

    const sig = signal();
    let calls = 0;
    const debouncedFn = debouncePromise(() => {
      ++calls;
      return sig;
    });

    expect(calls).toBe(0);

    debouncedFn();
    expect(calls).toBe(1);

    // the original function should not be called until the signal is resolved
    debouncedFn();
    debouncedFn();
    await Promise.resolve();
    expect(calls).toBe(1);

    // once the first promise is resolved, the second call should start
    let promise = debouncedFn.currentPromise;
    if (!promise) {
      throw new Error("currentPromise should be defined");
    }
    promise = promise.then(() => {
      expect(calls).toBe(2);
    });

    sig.resolve();

    await promise;

    // after pending calls are finished, there is no more currentPromise
    expect(debouncedFn.currentPromise).toBeUndefined();
  });

  it("handles nested calls", async () => {
    expect.assertions(3);

    let calls = 0;
    const debouncedFn = debouncePromise(async () => {
      ++calls;
      if (calls === 1) {
        debouncedFn();
        expect(calls).toBe(1);
      }
    });

    debouncedFn();
    expect(calls).toBe(1);
    await Promise.resolve();
    expect(calls).toBe(2);
  });
});
