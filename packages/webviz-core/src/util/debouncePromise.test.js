// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import debouncePromise from "./debouncePromise";
import signal from "webviz-core/shared/signal";

process.on("unhandledRejection", () => {
  // Have a dummy handler for all unhandled rejections
  // This is to prevent UnhandledPromiseRejection on promises that we reject in tests here
});

/* eslint-disable jest/valid-expect-in-promise */

describe("debouncePromise", () => {
  it("debounces with resolved and rejected promises", async () => {
    const promises = [signal(), signal(), signal(), signal()];

    let calls = 0;
    const debouncedFn = debouncePromise(() => {
      return promises[calls++];
    });

    expect(calls).toBe(0);

    debouncedFn();
    debouncedFn();
    debouncedFn();
    debouncedFn();
    expect(calls).toBe(1);

    await promises[0].resolve();

    expect(calls).toBe(2);
    expect(debouncedFn.currentPromise).toBeDefined();

    debouncedFn();
    debouncedFn();
    await promises[1].reject(new Error("rejected"));
    expect(calls).toBe(3);
    expect(debouncedFn.currentPromise).toBeDefined();

    debouncedFn();
    expect(calls).toBe(3);
    await promises[2].reject(new Error("rejected"));

    expect(calls).toBe(4);
    await promises[3].resolve();
    expect(debouncedFn.currentPromise).toBeUndefined();
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
