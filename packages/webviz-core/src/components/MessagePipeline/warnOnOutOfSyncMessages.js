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
import sendNotification from "webviz-core/src/util/sendNotification";
import { subtractTimes, toSec, formatFrame, getTimestampForMessage } from "webviz-core/src/util/time";

const DRIFT_THRESHOLD_SEC = 1; // Maximum amount of drift allowed.
const WAIT_FOR_SEEK_SEC = 1; // How long we wait for a change in `lastSeekTime` before warning.

const log = new Logger(__filename);

// Logs a warning when there is a significant difference (more than `DRIFT_THRESHOLD_SEC`) between
// a message's timestamp and `player.currentTime` OR when messages went back in time,
// except when `player.lastSeekTime` changes, in which case panels should be clearing out their stored data.
//
// This is to ensure that other mechanisms that we have in place for either discarding old messages
// or forcing an update of `player.lastSeekTime` are working properly.
let lastMessages: ?$ReadOnlyArray<Message>;
let lastCurrentTime: ?Time;
let lastMessageTime: ?Time;
let lastMessageTopic: ?string;
let lastLastSeekTime: ?number;
let warningTimeout: ?TimeoutID;
let incorrectMessages: Message[] = [];

export default function warnOnOutOfSyncMessages(playerState: PlayerState) {
  if (!playerState.activeData) {
    return;
  }
  const { messages, messageOrder, currentTime, lastSeekTime } = playerState.activeData;
  if (lastLastSeekTime !== lastSeekTime) {
    lastLastSeekTime = lastSeekTime;
    if (warningTimeout) {
      clearTimeout(warningTimeout);
      incorrectMessages = [];
    }
    warningTimeout = lastMessages = lastMessageTime = lastCurrentTime = undefined;
  }
  if (lastMessages !== messages || lastCurrentTime !== currentTime) {
    lastMessages = messages;
    lastCurrentTime = currentTime;
    for (const message: Message of messages) {
      const messageTime = getTimestampForMessage(message, messageOrder);
      if (!messageTime) {
        sendNotification(
          `Message has no ${messageOrder}`,
          `Received a message on topic ${message.topic} around ${formatFrame(currentTime)} with ` +
            `no ${messageOrder} when sorting by that method.`,
          "app",
          "warn"
        );
        lastMessageTopic = message.topic;
        lastMessageTime = undefined;
        continue;
      }
      const currentTimeDrift = Math.abs(toSec(subtractTimes(messageTime, currentTime)));

      if (currentTimeDrift > DRIFT_THRESHOLD_SEC) {
        incorrectMessages.push(message);
        if (!warningTimeout) {
          warningTimeout = setTimeout(() => {
            log.warn(`${messageOrder} very different from player.currentTime; without updating lastSeekTime`, {
              currentTime,
              lastSeekTime,
              messageOrder,
              messageTime,
              incorrectMessages,
            });
          }, WAIT_FOR_SEEK_SEC * 1000);
        }
      }

      if (lastMessageTime && lastMessageTopic && TimeUtil.isLessThan(messageTime, lastMessageTime)) {
        sendNotification(
          "Bag went back in time",
          `Processed a message on ${message.topic} at ${formatFrame(messageTime)} which is earlier than ` +
            `last processed message on ${lastMessageTopic} at ${formatFrame(lastMessageTime)}. ` +
            `Data source may be corrupted on these or other topics.`,
          "user",
          "warn"
        );
      }
      lastMessageTopic = message.topic;
      lastMessageTime = messageTime;
    }
  }
}
