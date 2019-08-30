// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { useCleanup } from "@cruise-automation/hooks";
import React, { type Node, useRef, useCallback, useMemo, useState, useEffect } from "react";
import type { Time } from "rosbag";
import uuid from "uuid";

import { useChangeDetector, useShallowMemo, useMustNotChange, useShouldNotChangeOften } from "./hooks";
import { useMessagePipeline } from "webviz-core/src/components/MessagePipeline";
import PerfMonitor from "webviz-core/src/components/PerfMonitor";
import type { Message, SubscribePayload } from "webviz-core/src/players/types";

// This is an internal component which only supports topics,
// not full paths. Since full paths are a superset of topics, we figured we'd not expose this
// internal component to end users, but it's useful to keep as a separate abstraction so the logic
// here is not tangled up with the logic of paths.

type MessageHistoryOnlyTopicsData<T> = {|
  reducedValue: T,
  cleared: boolean,
  startTime: Time,
|};

type MessageReducer<T> = (T, message: Message) => T;

type Props<T> = {|
  children: (MessageHistoryOnlyTopicsData<T>) => Node,
  panelType: ?string,
  topicPrefix: string,
  topics: string[],
  imageScale?: number,

  // Functions called when the reducers change and for each newly received message.
  // The object is assumed to be immutable, so in order to trigger a re-render, the reducers must
  // return a new object.
  restore: (?T) => T,
  addMessage: MessageReducer<T>,
|};

// Apply changes in topics or messages to the reduced value. clearedRef will be set to true when the reducers or seek time change.
function useReducedValue<T>(
  restore: (?T) => T,
  addMessage: MessageReducer<T>,
  lastSeekTime: number,
  messages: Message[],
  clearedRef: { current: boolean }
): T {
  const reducedValueRef = useRef<?T>();

  const shouldClear = useChangeDetector([lastSeekTime], false);
  const reducersChanged = useChangeDetector([restore, addMessage], false);
  const messagesChanged = useChangeDetector([messages], true);

  if (shouldClear) {
    clearedRef.current = true;
  }

  if (!reducedValueRef.current || shouldClear) {
    // Call restore to create an initial state and whenever seek time changes.
    reducedValueRef.current = restore(undefined);
  } else if (reducersChanged) {
    // Allow new reducers to restore the previous state when the reducers change.
    reducedValueRef.current = restore(reducedValueRef.current);
  }

  // Use the addMessage reducer to process new messages.
  if (messagesChanged) {
    reducedValueRef.current = messages.reduce(addMessage, reducedValueRef.current);
  }

  return reducedValueRef.current;
}

// Create modified versions of topics and addMessage to support topic prefixes.
function useTopicPrefix<T>(
  topicPrefix: string,
  unprefixedRequestedTopics: string[],
  unprefixedAddMessage: MessageReducer<T>
): [string[], MessageReducer<T>] {
  const memoizedUnprefixedRequestedTopics = useShallowMemo(unprefixedRequestedTopics);
  const requestedTopics = useMemo(
    () => {
      return memoizedUnprefixedRequestedTopics.map((topic) => topicPrefix + topic);
    },
    [topicPrefix, memoizedUnprefixedRequestedTopics]
  );

  const addMessage = useCallback(
    (value: T, message) =>
      message.topic.startsWith(topicPrefix)
        ? unprefixedAddMessage(value, {
            ...message,
            topic: message.topic.slice(topicPrefix.length),
          })
        : value,
    [unprefixedAddMessage, topicPrefix]
  );

  return [requestedTopics, addMessage];
}

// Compute the subscriptions to be requested from the player.
function useSubscriptions(requestedTopics: string[], imageScale?: ?number, panelType?: ?string): SubscribePayload[] {
  useMustNotChange(imageScale, "Changing imageScale is not supported; please remount instead.");
  return useMemo(
    () => {
      let encodingAndScalePayload = {};
      if (imageScale !== undefined) {
        // We might be able to remove the `encoding` field from the protocol entirely, and only
        // use scale. Or we can deal with scaling down in a different way altogether, such as having
        // special topics or syntax for scaled down versions of images or so. In any case, we should
        // be cautious about having metadata on subscriptions, as that leads to the problem of how to
        // deal with multiple subscriptions to the same topic but with different metadata.
        encodingAndScalePayload = { encoding: "image/compressed", scale: imageScale };
      }

      const requester = panelType ? { type: "panel", name: panelType } : undefined;
      return requestedTopics.map((topic) => ({ topic, requester, ...encodingAndScalePayload }));
    },
    [requestedTopics, imageScale, panelType]
  );
}

// Be sure to pass in a new render function when you want to force a rerender.
// So you probably don't want to do
// `<MessageHistoryOnlyTopics>{this._renderSomething}</MessageHistoryOnlyTopics>`.
// This might be a bit counterintuitive but we do this since performance matters here.
export default function MessageHistoryOnlyTopics<T>(props: Props<T>) {
  const [id] = useState(() => uuid.v4());
  const {
    playerState: { activeData },
    setSubscriptions,
  } = useMessagePipeline();

  useShouldNotChangeOften(
    props.restore,
    "MessageHistoryOnlyTopics restore() is changing frequently. " +
      "restore() will be called each time it changes, so a new function " +
      "shouldn't be created on each render. (If you're using Hooks, try useCallback.)"
  );
  useShouldNotChangeOften(
    props.addMessage,
    "MessageHistoryOnlyTopics addMessage() is changing frequently. " +
      "restore() will be called each time it changes, so a new function " +
      "shouldn't be created on each render. (If you're using Hooks, try useCallback.)"
  );

  const [requestedTopics, addMessage] = useTopicPrefix<T>(props.topicPrefix, props.topics, props.addMessage);

  const subscriptions = useSubscriptions(requestedTopics, props.imageScale, props.panelType);
  useEffect(() => setSubscriptions(id, subscriptions), [id, setSubscriptions, subscriptions]);
  useCleanup(() => setSubscriptions(id, []));

  const { children } = props;

  const messages = activeData ? activeData.messages : [];
  const lastSeekTime = activeData ? activeData.lastSeekTime : 0;
  const startTime = activeData ? activeData.startTime : { sec: 0, nsec: 0 };

  const clearedRef = useRef(false);
  const reducedValue = useReducedValue<T>(props.restore, addMessage, lastSeekTime, messages, clearedRef);

  return useMemo(
    () => {
      const cleared = clearedRef.current;
      clearedRef.current = false;
      return <PerfMonitor id={id}>{children({ reducedValue, cleared, startTime })}</PerfMonitor>;
    },
    [children, id, reducedValue, startTime]
  );
}
