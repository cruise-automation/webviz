// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { useCleanup } from "@cruise-automation/hooks";
import { type Node, useRef, useCallback, useMemo, useState, useEffect, useContext } from "react";
import type { Time } from "rosbag";
import uuid from "uuid";

import {
  useChangeDetector,
  useShallowMemo,
  useMustNotChange,
  useShouldNotChangeOften,
  useContextSelector,
} from "./hooks";
import { useMessagePipeline } from "webviz-core/src/components/MessagePipeline";
import PanelContext from "webviz-core/src/components/PanelContext";
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

const NO_MESSAGES = Object.freeze([]);

// TODO: remove clearedRef and just return T
export function useMessages<T>(props: Props<T>): {| reducedValue: T, _clearedRef: {| current: boolean |} |} {
  const [id] = useState(() => uuid.v4());
  const { topicPrefix = "", type: panelType = undefined } = useContext(PanelContext) || {};

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

  // TODO(jacob): is it safe to call restore() when topicPrefix changes?
  const [requestedTopics, addMessage] = useTopicPrefix<T>(topicPrefix, props.topics, props.addMessage);
  const requestedTopicsSet = useMemo(() => new Set(requestedTopics), [requestedTopics]);

  const subscriptions = useSubscriptions(requestedTopics, props.imageScale, panelType);
  const setSubscriptions = useMessagePipeline(useCallback(({ setSubscriptions }) => setSubscriptions, []));
  useEffect(() => setSubscriptions(id, subscriptions), [id, setSubscriptions, subscriptions]);
  useCleanup(() => setSubscriptions(id, []));

  // Keep a reference to the last messages we processed to ensure we never process them more than once.
  // If the topics we care about change, the player should send us new messages soon anyway (via backfill if paused).
  const lastProcessedMessagesRef = useRef<?(Message[])>();
  // Keep a ref to the latest requested topics we were rendered with, because the useMessagePipeline
  // selector's dependencies aren't allowed to change.
  const latestRequestedTopicsRef = useRef(requestedTopicsSet);
  latestRequestedTopicsRef.current = requestedTopicsSet;
  const messages = useMessagePipeline<Message[]>(
    useCallback(({ playerState: { activeData } }) => {
      if (!activeData) {
        return NO_MESSAGES; // identity must not change to avoid unnecessary re-renders
      }
      if (lastProcessedMessagesRef.current === activeData.messages) {
        return useContextSelector.BAILOUT;
      }
      const filteredMessages = activeData.messages.filter(({ topic }) => latestRequestedTopicsRef.current.has(topic));
      // Bail out if we didn't want any of these messages, but not if this is our first render
      const shouldBail = lastProcessedMessagesRef.current && filteredMessages.length === 0;
      lastProcessedMessagesRef.current = activeData.messages;
      return shouldBail ? useContextSelector.BAILOUT : filteredMessages;
    }, [])
  );

  const lastSeekTime = useMessagePipeline(
    useCallback(({ playerState: { activeData } }) => (activeData ? activeData.lastSeekTime : 0), [])
  );

  const clearedRef = useRef(false);
  const reducedValue = useReducedValue<T>(props.restore, addMessage, lastSeekTime, messages, clearedRef);
  return { reducedValue, _clearedRef: clearedRef };
}

export default function MessageHistoryOnlyTopics<T>(props: {|
  ...Props<T>,
  children: (MessageHistoryOnlyTopicsData<T>) => Node,
|}) {
  const { children, ...useMessagesProps } = props;
  const { reducedValue, _clearedRef: clearedRef } = useMessages(useMessagesProps);
  const startTime = useMessagePipeline(
    useCallback(({ playerState: { activeData } }) => activeData && activeData.startTime, [])
  );

  return useMemo(
    () => {
      const cleared = clearedRef.current;
      clearedRef.current = false;
      return children({ reducedValue, cleared, startTime: startTime || { sec: 0, nsec: 0 } });
    },
    [children, clearedRef, reducedValue, startTime]
  );
}
