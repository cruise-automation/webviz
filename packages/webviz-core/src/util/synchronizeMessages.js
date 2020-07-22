// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { mapValues } from "lodash";
import { TimeUtil, type Time } from "rosbag";

import type { MessageHistoryItemsByPath } from "webviz-core/src/components/MessageHistoryDEPRECATED";
import { cast, type Message } from "webviz-core/src/players/types";
import type { RosObject } from "webviz-core/src/players/types";
import type { StampedMessage } from "webviz-core/src/types/Messages";

const defaultGetHeaderStamp = (message: ?$ReadOnly<RosObject>): ?Time => {
  if (message != null && message.header != null) {
    return cast<StampedMessage>(message).header.stamp;
  }
};

// Get all timestamps of all messages, newest first
function allItemStampsNewestFirst(
  itemsByPath: MessageHistoryItemsByPath,
  getHeaderStamp?: (itemMessage: Message) => ?Time
): Time[] {
  const stamps = [];
  for (const path in itemsByPath) {
    for (const item of itemsByPath[path]) {
      const stamp = getHeaderStamp ? getHeaderStamp(item.message) : defaultGetHeaderStamp(item.message?.message);
      if (!stamp) {
        return [];
      }
      stamps.push(stamp);
    }
  }
  return stamps.sort((a, b) => -TimeUtil.compare(a, b));
}
function allMessageStampsNewestFirst(messagesByTopic: { [topic: string]: Message[] }) {
  const stamps = [];
  for (const topic in messagesByTopic) {
    for (const { message } of messagesByTopic[topic]) {
      const stamp = defaultGetHeaderStamp(message);
      if (stamp) {
        stamps.push(stamp);
      }
    }
  }
  return stamps.sort((a, b) => -TimeUtil.compare(a, b));
}

// Get a subset of items matching a particular timestamp
function itemsMatchingStamp(
  stamp: Time,
  itemsByPath: MessageHistoryItemsByPath,
  getHeaderStamp?: (itemMessage: Message) => ?Time
): ?MessageHistoryItemsByPath {
  const synchronizedItemsByPath = {};
  for (const path in itemsByPath) {
    let found = false;
    for (const item of itemsByPath[path]) {
      const thisStamp = getHeaderStamp ? getHeaderStamp(item.message) : defaultGetHeaderStamp(item.message?.message);
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
export default function synchronizeMessages(
  itemsByPath: MessageHistoryItemsByPath,
  getHeaderStamp?: (itemMessage: Message) => ?Time
): ?MessageHistoryItemsByPath {
  for (const stamp of allItemStampsNewestFirst(itemsByPath, getHeaderStamp)) {
    const synchronizedItemsByPath = itemsMatchingStamp(stamp, itemsByPath, getHeaderStamp);
    if (synchronizedItemsByPath) {
      return synchronizedItemsByPath;
    }
  }
  return null;
}

function getSynchronizedMessages(
  stamp: Time,
  topics: $ReadOnlyArray<string>,
  messages: { [topic: string]: Message[] }
): ?{ [topic: string]: Message } {
  const synchronizedMessages = {};
  for (const topic of topics) {
    const matchingMessage = messages[topic].find(({ message }) => {
      const thisStamp = message?.header?.stamp;
      return thisStamp && TimeUtil.areSame(stamp, thisStamp);
    });
    if (!matchingMessage) {
      return null;
    }
    synchronizedMessages[topic] = matchingMessage;
  }
  return synchronizedMessages;
}

type ReducedValue = {|
  messagesByTopic: { [topic: string]: Message[] },
  synchronizedMessages: ?{ [topic: string]: Message },
|};

function getSynchronizedState(
  topics: $ReadOnlyArray<string>,
  { messagesByTopic, synchronizedMessages }: ReducedValue
): ReducedValue {
  let newMessagesByTopic = messagesByTopic;
  let newSynchronizedMessages = synchronizedMessages;

  for (const stamp of allMessageStampsNewestFirst(messagesByTopic)) {
    const syncedMsgs = getSynchronizedMessages(stamp, topics, messagesByTopic);
    if (syncedMsgs) {
      // We've found a new synchronized set; remove messages older than these.
      newSynchronizedMessages = syncedMsgs;
      newMessagesByTopic = mapValues(newMessagesByTopic, (msgsByTopic) =>
        msgsByTopic.filter(({ message }) => {
          const thisStamp = message?.header?.stamp;
          return !TimeUtil.isLessThan(thisStamp, stamp);
        })
      );
      break;
    }
  }
  return { messagesByTopic: newMessagesByTopic, synchronizedMessages: newSynchronizedMessages };
}

// Returns reducers for use with PanelAPI.useMessageReducer
export function getSynchronizingReducers(topics: $ReadOnlyArray<string>) {
  return {
    restore(previousValue: ?ReducedValue) {
      const messagesByTopic = {};
      for (const topic of topics) {
        messagesByTopic[topic] = (previousValue && previousValue.messagesByTopic[topic]) || [];
      }
      return getSynchronizedState(topics, { messagesByTopic, synchronizedMessages: null });
    },
    addMessage({ messagesByTopic, synchronizedMessages }: ReducedValue, newMessage: Message) {
      return getSynchronizedState(topics, {
        messagesByTopic: {
          ...messagesByTopic,
          [newMessage.topic]: messagesByTopic[newMessage.topic]
            ? messagesByTopic[newMessage.topic].concat(newMessage)
            : [newMessage],
        },
        synchronizedMessages,
      });
    },
  };
}
