// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { useCleanup } from "@cruise-automation/hooks";
import { useRef, useCallback, useMemo, useState, useEffect, useContext } from "react";
import uuid from "uuid";

import { useMessagePipeline } from "webviz-core/src/components/MessagePipeline";
import PanelContext from "webviz-core/src/components/PanelContext";
import type { Message, SubscribePayload } from "webviz-core/src/players/types";
import {
  useChangeDetector,
  useShouldNotChangeOften,
  useContextSelector,
  useDeepMemo,
} from "webviz-core/src/util/hooks";

type MessageReducer<T> = (T, message: Message) => T;
export type RequestedTopic = string | {| topic: string, imageScale: number |};

// Apply changes in topics or messages to the reduced value.
function useReducedValue<T>(
  restore: (?T) => T,
  addMessage: MessageReducer<T>,
  lastSeekTime: number,
  messages: Message[]
): T {
  const reducedValueRef = useRef<?T>();

  const shouldClear = useChangeDetector([lastSeekTime], false);
  const reducersChanged = useChangeDetector([restore, addMessage], false);
  const messagesChanged = useChangeDetector([messages], true);

  if (!reducedValueRef.current || shouldClear) {
    // Call restore to create an initial state and whenever seek time changes.
    reducedValueRef.current = restore(undefined);
  } else if (reducersChanged) {
    // Allow new reducers to restore the previous state when the reducers change.
    reducedValueRef.current = restore(reducedValueRef.current);
  }

  // Use the addMessage reducer to process new messages.
  if (messagesChanged) {
    reducedValueRef.current = messages.reduce(
      // .reduce() passes 4 args to callback function,
      // but we want to call addMessage with only first 2 args
      (value: T, message: Message) => addMessage(value, message),
      reducedValueRef.current
    );
  }

  return reducedValueRef.current;
}

// Compute the subscriptions to be requested from the player.
function useSubscriptions(requestedTopics: $ReadOnlyArray<RequestedTopic>, panelType?: ?string): SubscribePayload[] {
  return useMemo(
    () => {
      const requester = panelType ? { type: "panel", name: panelType } : undefined;
      return requestedTopics.map((request) => {
        if (typeof request === "object") {
          // We might be able to remove the `encoding` field from the protocol entirely, and only
          // use scale. Or we can deal with scaling down in a different way altogether, such as having
          // special topics or syntax for scaled down versions of images or so. In any case, we should
          // be cautious about having metadata on subscriptions, as that leads to the problem of how to
          // deal with multiple subscriptions to the same topic but with different metadata.
          return { topic: request.topic, requester, encoding: "image/compressed", scale: request.imageScale };
        }
        return { topic: request, requester };
      });
    },
    [requestedTopics, panelType]
  );
}

const NO_MESSAGES = Object.freeze([]);

type Props<T> = {|
  topics: $ReadOnlyArray<RequestedTopic>,

  // Functions called when the reducers change and for each newly received message.
  // The object is assumed to be immutable, so in order to trigger a re-render, the reducers must
  // return a new object.
  restore: (?T) => T,
  addMessage: MessageReducer<T>,
|};

export function useMessageReducer<T>(props: Props<T>): T {
  const [id] = useState(() => uuid.v4());
  const { type: panelType = undefined } = useContext(PanelContext) || {};

  useShouldNotChangeOften(
    props.restore,
    "useMessageReducer restore() is changing frequently. " +
      "restore() will be called each time it changes, so a new function " +
      "shouldn't be created on each render. (If you're using Hooks, try useCallback.)"
  );
  useShouldNotChangeOften(
    props.addMessage,
    "useMessageReducer addMessage() is changing frequently. " +
      "restore() will be called each time it changes, so a new function " +
      "shouldn't be created on each render. (If you're using Hooks, try useCallback.)"
  );

  const requestedTopics = useDeepMemo(props.topics);
  const requestedTopicsSet = useMemo(
    () => new Set(requestedTopics.map((req) => (typeof req === "object" ? req.topic : req))),
    [requestedTopics]
  );
  const subscriptions = useSubscriptions(requestedTopics, panelType);
  const setSubscriptions = useMessagePipeline(
    useCallback(({ setSubscriptions: pipelineSetSubscriptions }) => pipelineSetSubscriptions, [])
  );
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

  return useReducedValue<T>(props.restore, props.addMessage, lastSeekTime, messages);
}
