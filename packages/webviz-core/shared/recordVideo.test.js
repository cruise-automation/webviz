// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { useFakeTimers } from "sinon";

import { waitForXhrRequests } from "./recordVideo";
import delay from "webviz-core/shared/delay";

describe("waitForXhrRequests", () => {
  let clock;

  beforeEach(() => {
    clock = useFakeTimers();
  });
  afterEach(() => {
    clock.restore();
  });

  async function delayBy(durationMs) {
    const delayPromise = delay(durationMs);
    clock.tick(durationMs);
    await delayPromise;
  }

  it("does not wait if there are no requests", async () => {
    const pendingUrls = new Set();
    let done = false;
    waitForXhrRequests(pendingUrls).then(() => (done = true));
    expect(done).toBeFalsy();

    await delayBy(1);
    expect(done).toBeTruthy();
  });

  it("waits for requests", async () => {
    const pendingUrls = new Set(["1", "2"]);
    let done = false;
    waitForXhrRequests(pendingUrls).then(() => (done = true));
    expect(done).toBeFalsy();

    await delayBy(1000);
    expect(done).toBeFalsy();

    pendingUrls.delete("1");
    await delayBy(1000);
    expect(done).toBeFalsy();

    pendingUrls.delete("2");
    // We wait for one more cycle before resolving, so we need a few extra delays here
    await delayBy(1000);
    await delayBy(1000);
    await delayBy(1000);
    expect(done).toBeTruthy();
  });

  it("clears the pending urls if they timeout", async () => {
    const pendingUrls = new Set(["1"]);
    let done = false;
    waitForXhrRequests(pendingUrls).then(() => (done = true));
    expect(done).toBeFalsy();

    await delayBy(40000);
    expect(done).toBeTruthy();
    expect(pendingUrls.size).toBe(0);
  });
});
