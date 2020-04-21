// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { type Time, TimeUtil } from "rosbag";

import type { Message, PlayerState } from "webviz-core/src/players/types";
import Logger from "webviz-core/src/util/Logger";
import reportError from "webviz-core/src/util/reportError";
import { subtractTimes, toSec, formatFrame } from "webviz-core/src/util/time";

const DRIFT_THRESHOLD_SEC = 1; // Maximum amount of drift allowed.
const WAIT_FOR_SEEK_SEC = 1; // How long we wait for a change in `lastSeekTime` before warning.

const log = new Logger(__filename);

// Logs a warning when there is a significant difference (more than `DRIFT_THRESHOLD_SEC`) between
// a message's `receiveTime` and `player.currentTime` OR when messages went back in time,
// except when `player.lastSeekTime` changes, in which case panels should be clearing out their stored data.
//
// This is to ensure that other mechanisms that we have in place for either discarding old messages
// or forcing an update of `player.lastSeekTime` are working properly.
let lastMessages: ?(Message[]);
let lastCurrentTime: ?Time;
let lastReceiveTime: ?Time;
let lastReceiveTopic: ?string;
let lastLastSeekTime: ?number;
let warningTimeout: ?TimeoutID;
let incorrectMessages: Message[] = [];

export default function warnOnOutOfSyncMessages(playerState: PlayerState) {
  if (!playerState.activeData) {
    return;
  }
  const { messages, currentTime, lastSeekTime } = playerState.activeData;
  if (lastLastSeekTime !== lastSeekTime) {
    lastLastSeekTime = lastSeekTime;
    if (warningTimeout) {
      clearTimeout(warningTimeout);
      incorrectMessages = [];
    }
    warningTimeout = lastMessages = lastReceiveTime = lastCurrentTime = undefined;
  }
  if (lastMessages !== messages || lastCurrentTime !== currentTime) {
    lastMessages = messages;
    lastCurrentTime = currentTime;
    for (const message: Message of messages) {
      const currentTimeDrift = Math.abs(toSec(subtractTimes(message.receiveTime, currentTime)));

      if (currentTimeDrift > DRIFT_THRESHOLD_SEC) {
        incorrectMessages.push(message);
        if (!warningTimeout) {
          warningTimeout = setTimeout(() => {
            log.warn("message.receiveTime very different from player.currentTime; without updating lastSeekTime", {
              currentTime,
              lastSeekTime,
              incorrectMessages: incorrectMessages.map((msg) => ({
                receiveTime: msg.receiveTime,
                topic: msg.topic,
              })),
            });
          }, WAIT_FOR_SEEK_SEC * 1000);
        }
      }

      if (lastReceiveTime && lastReceiveTopic && TimeUtil.isLessThan(message.receiveTime, lastReceiveTime)) {
        reportError(
          "Bag went back in time",
          `Received a message on ${message.topic} at ${formatFrame(message.receiveTime)} which is earlier than ` +
            `last received message on ${lastReceiveTopic} at ${formatFrame(lastReceiveTime)}. ` +
            `Data source may be corrupted on these or other topics.`,
          "user"
        );
      }
      lastReceiveTopic = message.topic;
      lastReceiveTime = message.receiveTime;
    }
  }
}
