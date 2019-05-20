// @flow
//
//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import get from "lodash/get";
import { TimeUtil, type Time } from "rosbag";

import type { MessageHistoryItemsByPath } from ".";

// Get all timestamps of all messages, newest first
function allStampsNewestFirst(itemsByPath: MessageHistoryItemsByPath): Time[] {
  const stamps = [];
  for (const path in itemsByPath) {
    for (const item of itemsByPath[path]) {
      const stamp = get(item.message, ["message", "header", "stamp"]);
      if (!stamp) {
        return [];
      }
      stamps.push(stamp);
    }
  }
  return stamps.sort((a, b) => -TimeUtil.compare(a, b));
}

// Get a subset of items matching a particular timestamp
function messagesMatchingStamp(stamp: Time, itemsByPath: MessageHistoryItemsByPath): ?MessageHistoryItemsByPath {
  const synchronizedItemsByPath = {};
  for (const path in itemsByPath) {
    let found = false;
    for (const item of itemsByPath[path]) {
      const thisStamp = item.message.message.header.stamp;
      if (thisStamp && TimeUtil.areSame(stamp, thisStamp)) {
        found = true;
        synchronizedItemsByPath[path] = [item];
        break;
      }
    }
    if (!found) {
      return null;
    }
  }
  return synchronizedItemsByPath;
}

// Return a synchronized subset of the messages in `itemsByPath` with exactly matching header.stamps.
// If multiple sets of synchronized messages are included, the one with the later header.stamp is returned.
export default function synchronizeMessages(itemsByPath: MessageHistoryItemsByPath): ?MessageHistoryItemsByPath {
  for (const stamp of allStampsNewestFirst(itemsByPath)) {
    const synchronizedItemsByPath = messagesMatchingStamp(stamp, itemsByPath);
    if (synchronizedItemsByPath) {
      return synchronizedItemsByPath;
    }
  }
  return null;
}
