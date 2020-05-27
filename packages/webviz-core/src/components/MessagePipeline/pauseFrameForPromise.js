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
export const MAX_PROMISE_TIMEOUT_TIME_MS = inAutomatedRunMode() ? 30000 : 5000;

let timeoutErrorCount = 0;
export async function pauseFrameForPromises(promises: FramePromise[]) {
  try {
    await promiseTimeout(Promise.all(promises.map(({ promise }) => promise)), MAX_PROMISE_TIMEOUT_TIME_MS);
    timeoutErrorCount = 0;
  } catch (error) {
    if (error.message.includes("Promise timed out")) {
      sendNotification(
        `An async render task failed to finish in time; some panels may display data from the wrong frame.`,
        `One of the following \`pauseFrame\` callers failed to unpause within ${MAX_PROMISE_TIMEOUT_TIME_MS}ms: ${promises
          .map(({ name }) => name)
          .join(", ")}\nIf this happens many times in a row, it could be a bug; please report it.`,
        "app",
        // Only report an error if this happens twice in a row or we are running in automated mode.
        // This error mostly occurs when initializing plot and image panels, but if we have a bug in our system we could
        // see it happen over and over. If it happens multiple times in a row report the error to us.
        timeoutErrorCount > 0 || inAutomatedRunMode() ? "error" : "info"
      );
      timeoutErrorCount++;
    } else {
      sendNotification("Player ", error, "app", "error");
    }
  }
}

export function resetErrorCountInTesting() {
  timeoutErrorCount = 0;
}
