// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { flatten } from "lodash";
import { type Time } from "rosbag";

import type { Frame, Message } from "webviz-core/src/types/players";
import type { Store } from "webviz-core/src/types/Store";
import Logger from "webviz-core/src/util/Logger";
import { subtractTimes, toSec } from "webviz-core/src/util/time";

const DRIFT_THRESHOLD_SEC = 1; // Maximum amount of drift allowed.
const WAIT_FOR_SEEK_SEC = 1; // How long we wait for a change in `lastSeekTime` before warning.

const log = new Logger(__filename);

// Logs a warning when there is a significant difference (more than `DRIFT_THRESHOLD_SEC`) between
// a message's timestamp and `player.currentTime`, except when `player.lastSeekTime`
// changes, in which case panels should be clearing out their stored data.
//
// This is to ensure that other mechanisms that we have in place for either discarding old messages
// or forcing an update of `player.lastSeekTime` are working properly.
//
// TODO(JP): Make this use `receiveTime` instead of /webviz/clock (which we don't have in the
// open source version).
export default function warnOnOutOfSyncMessages(store: Store) {
  let lastFrame: ?Frame, lastCurrentTime: ?Time, lastLastSeekTime: ?number, warningTimeout: ?TimeoutID;
  let incorrectMessages: Message[] = [];

  store.subscribe(() => {
    const state = store.getState();
    const { frame, currentTime, lastSeekTime } = state.player;

    if (lastLastSeekTime !== lastSeekTime) {
      lastLastSeekTime = lastSeekTime;
      if (warningTimeout) {
        clearTimeout(warningTimeout);
        warningTimeout = lastFrame = lastCurrentTime = undefined;
        incorrectMessages = [];
      }
    }

    if (lastFrame !== frame || lastCurrentTime !== currentTime) {
      lastFrame = frame;
      lastCurrentTime = currentTime;

      if (!frame || !currentTime) {
        return;
      }

      for (const message: Message of flatten(Object.keys(frame).map((key) => frame[key]))) {
        const stamp: ?Time = message.message.header && message.message.header.stamp;
        if (!stamp || (stamp.sec === 0 && stamp.nsec === 0)) {
          continue;
        }

        if (Math.abs(toSec(subtractTimes(stamp, currentTime))) < DRIFT_THRESHOLD_SEC) {
          continue;
        }
        // Log this as an incorrect message, but first wait for WAIT_FOR_SEEK_SEC
        // because if we soon get a change in `lastSeekTime` then panels will clear out data
        // and all will be good. :)
        incorrectMessages.push(message);

        if (warningTimeout) {
          continue;
        }
        warningTimeout = setTimeout(() => {
          log.warn("message.header.stamp very different from player.currentTime; without updating lastSeekTime", {
            currentTime,
            lastSeekTime,
            incorrectMessages: incorrectMessages.map((msg) => ({
              stamp: msg.message.header.stamp,
              topic: msg.topic,
            })),
          });
        }, WAIT_FOR_SEEK_SEC * 1000);
      }
    }
  });
}
