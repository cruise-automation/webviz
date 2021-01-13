// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { mapValues } from "lodash";
import { TimeUtil, type Time } from "rosbag";

import { cast, type Message } from "webviz-core/src/players/types";
import type { RosObject } from "webviz-core/src/players/types";
import type { StampedMessage } from "webviz-core/src/types/Messages";

export const defaultGetHeaderStamp = (message: ?$ReadOnly<RosObject>): ?Time => {
  if (message != null && message.header != null) {
    return cast<StampedMessage>(message).header.stamp;
  }
};

function allMessageStampsNewestFirst(
  messagesByTopic: $ReadOnly<{ [topic: string]: $ReadOnlyArray<Message> }>,
  getHeaderStamp?: (itemMessage: Message) => ?Time
) {
  const stamps = [];
  for (const topic in messagesByTopic) {
    for (const message of messagesByTopic[topic]) {
      const stamp = getHeaderStamp ? getHeaderStamp(message) : defaultGetHeaderStamp(message.message);
      if (stamp) {
        stamps.push(stamp);
      }
    }
  }
  return stamps.sort((a, b) => -TimeUtil.compare(a, b));
}

// Get a subset of items matching a particular timestamp
function messagesMatchingStamp(
  stamp: Time,
  messagesByTopic: $ReadOnly<{ [topic: string]: $ReadOnlyArray<Message> }>,
  getHeaderStamp?: (itemMessage: Message) => ?Time
): ?$ReadOnly<{ [topic: string]: $ReadOnlyArray<Message> }> {
  const synchronizedMessagesByTopic = {};
  for (const topic in messagesByTopic) {
    const synchronizedMessage = messagesByTopic[topic].find((message) => {
      const thisStamp = getHeaderStamp ? getHeaderStamp(message) : defaultGetHeaderStamp(message.message);
      return thisStamp && TimeUtil.areSame(stamp, thisStamp);
    });
    if (synchronizedMessage != null) {
      synchronizedMessagesByTopic[topic] = [synchronizedMessage];
    } else {
      return null;
    }
  }
  return synchronizedMessagesByTopic;
}

// Return a synchronized subset of the messages in `messagesByTopic` with exactly matching
// header.stamps.
// If multiple sets of synchronized messages are included, the one with the later header.stamp is
// returned.
export default function synchronizeMessages(
  messagesByTopic: $ReadOnly<{ [topic: string]: $ReadOnlyArray<Message> }>,
  getHeaderStamp?: (itemMessage: Message) => ?Time
): ?$ReadOnly<{ [topic: string]: $ReadOnlyArray<Message> }> {
  for (const stamp of allMessageStampsNewestFirst(messagesByTopic, getHeaderStamp)) {
    const synchronizedMessagesByTopic = messagesMatchingStamp(stamp, messagesByTopic, getHeaderStamp);
    if (synchronizedMessagesByTopic != null) {
      return synchronizedMessagesByTopic;
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
