// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import fetchMock from "fetch-mock";

import { enforceFetchIsBlocked, inWebWorker, inSharedWorker } from "./workers";

describe("inWebWorker", () => {
  it("returns false in unit tests", () => {
    // Difficult to get positive cases in Jest, but covered by integration tests.
    expect(inWebWorker()).toBe(false);
  });
});

describe("inSharedWorker", () => {
  it("returns false in unit tests", () => {
    // Difficult to get positive cases in Jest, but covered by integration tests.
    expect(inSharedWorker()).toBe(false);
  });
});

describe("enforceFetchIsBlocked", () => {
  afterEach(() => {
    fetchMock.restore();
  });

  it("throws when fetch works", () => {
    fetchMock.get("test", 200);
    const wrappedFn = enforceFetchIsBlocked(() => "test");
    expect(wrappedFn).toBeInstanceOf(Function);
    expect(wrappedFn()).rejects.toThrow("Content security policy too loose.");
  });

  it("returns the output of the wrapped function when fetch fails", () => {
    fetchMock.get("test", { throws: new Error("hi!") });
    const wrappedFn = enforceFetchIsBlocked((arg) => `test${arg}`);
    expect(wrappedFn).toBeInstanceOf(Function);
    expect(wrappedFn(1)).resolves.toBe("test1");
  });
});
