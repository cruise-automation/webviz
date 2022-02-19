// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import queuePromise from "./queuePromise";
import { signal } from "./signal";

process.on("unhandledRejection", () => {
  // Have a dummy handler for all unhandled rejections
  // This is to prevent UnhandledPromiseRejection on promises that we reject in tests here
});

/* eslint-disable jest/valid-expect-in-promise */

describe("queuePromise", () => {
  it("queues with resolved and rejected promises", async () => {
    const secondPromise = signal();
    const promises = [Promise.resolve(), secondPromise, Promise.resolve()];

    let calls = 0;
    const callArgs = [];
    const queuedFn = queuePromise((...args) => {
      callArgs.push(args);
      ++calls;
      return promises.shift();
    });

    expect(calls).toBe(0);

    queuedFn(1, 2);
    queuedFn(3, 4);
    queuedFn(5, 6);
    expect(calls).toBe(1);
    expect(callArgs).toEqual([[1, 2]]);
    expect(queuedFn.currentPromise).not.toBeUndefined();

    await secondPromise.reject(new Error(""));
    expect(calls).toBe(2);
    expect(callArgs).toEqual([[1, 2], [3, 4]]);
    await Promise.resolve();

    expect(calls).toBe(3);
    expect(callArgs).toEqual([[1, 2], [3, 4], [5, 6]]);
    await Promise.resolve();
    expect(queuedFn.currentPromise).toBeUndefined();
  });

  it("returns a promise", async () => {
    const promises = [signal(), signal()];
    let calls = 0;
    const queuedFn = queuePromise((...args) => {
      ++calls;
      return promises[calls - 1];
    });

    const arePromisesResolved = [false, false];
    const promiseResults = [queuedFn(), queuedFn()];
    promiseResults.forEach((promise, index) =>
      promise.then(() => {
        arePromisesResolved[index] = true;
      })
    );
    expect(calls).toEqual(1);
    expect(arePromisesResolved).toEqual([false, false]);

    // resolve the first promise. This should move on to the second promise.
    promises[0].resolve();
    await promiseResults[0];
    expect(calls).toEqual(2);
    expect(arePromisesResolved).toEqual([true, false]);

    // resolve the second promise.
    promises[1].resolve();
    await promiseResults[1];
    expect(calls).toEqual(2);
    expect(arePromisesResolved).toEqual([true, true]);
  });

  it("handles nested calls", async () => {
    expect.assertions(3);

    let calls = 0;
    const queuedFn = queuePromise(async () => {
      ++calls;
      if (calls === 1) {
        queuedFn();
        expect(calls).toBe(1);
      }
    });

    queuedFn();
    expect(calls).toBe(1);
    await Promise.resolve();
    expect(calls).toBe(2);
  });
});
