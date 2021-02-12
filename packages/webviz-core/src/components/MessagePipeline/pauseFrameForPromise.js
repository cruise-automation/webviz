// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { sortBy, sortedUniq } from "lodash";

import promiseTimeout from "webviz-core/shared/promiseTimeout";
import inAutomatedRunMode from "webviz-core/src/util/inAutomatedRunMode";
import logEvent, { getEventNames, getEventTags } from "webviz-core/src/util/logEvent";
import sendNotification from "webviz-core/src/util/sendNotification";

export type FramePromise = {| name: string, promise: Promise<void> |};

// Wait longer before erroring if there's no user waiting (in automated run)
export const MAX_PROMISE_TIMEOUT_TIME_MS = inAutomatedRunMode() ? 30000 : 5000;

export async function pauseFrameForPromises(promises: FramePromise[]) {
  try {
    await promiseTimeout(Promise.all(promises.map(({ promise }) => promise)), MAX_PROMISE_TIMEOUT_TIME_MS);
  } catch (error) {
    // An async render task failed to finish in time; some panels may display data from the wrong frame.
    const isTimeoutError = error.message.includes("Promise timed out");
    if (!isTimeoutError || inAutomatedRunMode()) {
      sendNotification("Player ", error, "app", "error");
      return;
    }

    // Log the panelTypes so we can track which panels timeout regularly.
    const sortedUniquePanelTypes = sortedUniq(sortBy(promises.map(({ name }) => name)));
    logEvent({
      name: getEventNames().PAUSE_FRAME_TIMEOUT,
      tags: { [getEventTags().PANEL_TYPES]: sortedUniquePanelTypes },
    });
  }
}
