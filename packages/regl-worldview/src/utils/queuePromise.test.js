// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import queuePromise from "./queuePromise";

type Signal<T> = Promise<T> & {
  resolve: (T) => void,
  reject: (Error) => void,
};

function signal<T>(): Signal<T> {
  let resolve;
  let reject;
  const promise: any = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  promise.resolve = resolve;
  promise.reject = reject;
  return promise;
}

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
    expect(queuedFn.currentPromise).toBeUndefined();
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
