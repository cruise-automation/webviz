// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import promiseTimeout from "webviz-core/shared/promiseTimeout";
import inAutomatedRunMode from "webviz-core/src/util/inAutomatedRunMode";
import sendNotification from "webviz-core/src/util/sendNotification";

export type FramePromise = {| name: string, promise: Promise<void> |};
// Wait longer before erroring if there's no user waiting (in automated run)
export const MAX_PROMISE_TIMEOUT_TIME_MS = inAutomatedRunMode() ? 30000 : 3000;

export async function pauseFrameForPromises(promises: FramePromise[]) {
  try {
    await promiseTimeout(Promise.all(promises.map(({ promise }) => promise)), MAX_PROMISE_TIMEOUT_TIME_MS);
  } catch (error) {
    if (error.message.includes("Promise timed out")) {
      sendNotification(
        `\`pauseFrame\` was called, but frame was not resumed within ${MAX_PROMISE_TIMEOUT_TIME_MS}ms`,
        `One of the following \`pauseFrame\` callers failed to unpause: ${promises.map(({ name }) => name).join(", ")}`,
        "app",
        "error"
      );
    } else {
      sendNotification("Player ", error, "app", "warn");
    }
  }
}
