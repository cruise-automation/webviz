// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { pauseFrameForPromises, MAX_PROMISE_TIMEOUT_TIME_MS } from "./pauseFrameForPromise";
import delay from "webviz-core/shared/delay";
import signal from "webviz-core/shared/signal";
import inAutomatedRunMode from "webviz-core/src/util/inAutomatedRunMode";
import { initializeLogEvent, resetLogEventForTests } from "webviz-core/src/util/logEvent";
import sendNotification from "webviz-core/src/util/sendNotification";

const sendNotificationAny: any = sendNotification;

jest.setTimeout(MAX_PROMISE_TIMEOUT_TIME_MS * 3);
jest.mock("webviz-core/src/util/inAutomatedRunMode", () => jest.fn(() => false));

describe("pauseFrameForPromise", () => {
  afterEach(() => {
    // $FlowFixMe
    inAutomatedRunMode.mockImplementation(() => false);
  });

  it("sends the paused frame panel types to amplitude", async () => {
    const logger = jest.fn();
    initializeLogEvent(logger, { PAUSE_FRAME_TIMEOUT: "pause_frame_timeout" }, { PANEL_TYPES: "panel_types" });

    pauseFrameForPromises([
      { promise: signal(), name: "foo" },
      { promise: signal(), name: "bar" },
      { promise: signal(), name: "zoo" },
      { promise: signal(), name: "bar" },
    ]);
    await delay(MAX_PROMISE_TIMEOUT_TIME_MS + 20);

    expect(logger).toHaveBeenCalledWith({ name: "pause_frame_timeout", tags: { panel_types: ["bar", "foo", "zoo"] } });
    resetLogEventForTests();
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
