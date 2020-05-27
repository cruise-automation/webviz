// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { pauseFrameForPromises, resetErrorCountInTesting, MAX_PROMISE_TIMEOUT_TIME_MS } from "./pauseFrameForPromise";
import delay from "webviz-core/shared/delay";
import signal from "webviz-core/shared/signal";
import inAutomatedRunMode from "webviz-core/src/util/inAutomatedRunMode";
import sendNotification from "webviz-core/src/util/sendNotification";

const sendNotificationAny: any = sendNotification;

jest.setTimeout(MAX_PROMISE_TIMEOUT_TIME_MS * 3);

jest.mock("webviz-core/src/util/inAutomatedRunMode", () => jest.fn(() => false));

describe("pauseFrameForPromise", () => {
  afterEach(() => {
    resetErrorCountInTesting();
    // $FlowFixMe
    inAutomatedRunMode.mockImplementation(() => false);
  });

  it("reports an info message the first time called, but an error the second time called in a row", async () => {
    const promise = signal();
    pauseFrameForPromises([{ promise, name: "dummy" }]);
    await delay(MAX_PROMISE_TIMEOUT_TIME_MS + 20);

    pauseFrameForPromises([{ promise, name: "dummy" }]);
    await delay(MAX_PROMISE_TIMEOUT_TIME_MS + 20);

    expect(sendNotificationAny.mock.calls.length).toEqual(2);
    expect(sendNotificationAny.mock.calls[0][3]).toEqual("info");
    expect(sendNotificationAny.mock.calls[1][3]).toEqual("error");
    sendNotification.expectCalledDuringTest();
  });

  it("resets to reporting warnings if a successful frame happens in the meantime", async () => {
    const promise = signal();
    pauseFrameForPromises([{ promise, name: "dummy" }]);
    await delay(MAX_PROMISE_TIMEOUT_TIME_MS + 20);

    pauseFrameForPromises([{ promise, name: "dummy" }]);
    promise.resolve();
    await delay(20);

    const promise2 = signal();
    pauseFrameForPromises([{ promise: promise2, name: "dummy" }]);
    await delay(MAX_PROMISE_TIMEOUT_TIME_MS + 20);

    expect(sendNotificationAny.mock.calls.length).toEqual(2);
    expect(sendNotificationAny.mock.calls[0][3]).toEqual("info");
    expect(sendNotificationAny.mock.calls[1][3]).toEqual("info");
    sendNotification.expectCalledDuringTest();
  });

  it("always reports an error in automated run mode", async () => {
    // $FlowFixMe
    inAutomatedRunMode.mockImplementation(() => true);
    const promise = signal();
    pauseFrameForPromises([{ promise, name: "dummy" }]);
    await delay(MAX_PROMISE_TIMEOUT_TIME_MS + 20);

    expect(sendNotificationAny.mock.calls[0][3]).toEqual("error");
    sendNotification.expectCalledDuringTest();
  });
});
