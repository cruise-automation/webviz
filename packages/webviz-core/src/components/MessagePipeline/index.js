// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { createMemoryHistory } from "history";
import { flatten, groupBy } from "lodash";
import * as React from "react"; // eslint-disable-line import/no-duplicates
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"; // eslint-disable-line import/no-duplicates
import { Provider } from "react-redux";
import { type Time, TimeUtil } from "rosbag";

import warnOnOutOfSyncMessages from "./warnOnOutOfSyncMessages";
import {
  useShallowMemo,
  createSelectableContext,
  useContextSelector,
  type BailoutToken,
} from "webviz-core/src/components/MessageHistory/hooks";
import type {
  AdvertisePayload,
  Frame,
  Message,
  Player,
  PlayerState,
  PlayerStateActiveData,
  PublishPayload,
  SubscribePayload,
  Topic,
} from "webviz-core/src/players/types";
import createRootReducer from "webviz-core/src/reducers";
import configureStore from "webviz-core/src/store/configureStore";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";
import naturalSort from "webviz-core/src/util/naturalSort";

export type MessagePipelineContext = {|
  playerState: PlayerState,
  frame: Frame,
  sortedTopics: Topic[],
  datatypes: RosDatatypes,
  subscriptions: SubscribePayload[],
  publishers: AdvertisePayload[],
  setSubscriptions(id: string, subscriptionsForId: SubscribePayload[]): void,
  setPublishers(id: string, publishersForId: AdvertisePayload[]): void,
  publish(request: PublishPayload): void,
  startPlayback(): void,
  pausePlayback(): void,
  setPlaybackSpeed(speed: number): void,
  seekPlayback(time: Time): void,
|};

const Context = createSelectableContext<MessagePipelineContext>();

export function useMessagePipeline<T>(selector: (MessagePipelineContext) => T | BailoutToken): T {
  return useContextSelector(Context, selector);
}

function defaultPlayerState(): PlayerState {
  return {
    isPresent: false,
    showSpinner: false,
    showInitializing: false,
    progress: {},
    capabilities: [],
    playerId: "",
    activeData: undefined,
  };
}

type ProviderProps = {| children: React.Node, player?: ?Player |};
export function MessagePipelineProvider({ children, player }: ProviderProps) {
  const currentPlayer = useRef<?Player>(undefined);
  const [playerState, setPlayerState] = useState<PlayerState>(defaultPlayerState);
  const lastActiveData = useRef<?PlayerStateActiveData>(playerState.activeData);
  const [subscriptionsById, setAllSubscriptions] = useState<{ [string]: SubscribePayload[] }>({});
  const [publishersById: AdvertisePayload[], setAllPublishers: (AdvertisePayload[]) => void] = useState({});
  const resolveFn = useRef<?() => void>();

  const subscriptions: SubscribePayload[] = useMemo(
    () => flatten(Object.keys(subscriptionsById).map((k) => subscriptionsById[k])),
    [subscriptionsById]
  );
  const publishers: AdvertisePayload[] = useMemo(
    () => flatten(Object.keys(publishersById).map((k) => publishersById[k])),
    [publishersById]
  );
  useEffect(() => (player ? player.setSubscriptions(subscriptions) : undefined), [player, subscriptions]);
  useEffect(() => (player ? player.setPublishers(publishers) : undefined), [player, publishers]);

  // Delay the player listener promise until rendering has finished for the latest data.
  useLayoutEffect(
    () => {
      if (resolveFn.current) {
        requestAnimationFrame(() => {
          if (resolveFn.current) {
            resolveFn.current();
            resolveFn.current = undefined;
          }
        });
      }
    },
    [playerState]
  );

  useEffect(
    () => {
      currentPlayer.current = player;
      if (!player) {
        return;
      }
      player.setListener((newPlayerState: PlayerState) => {
        warnOnOutOfSyncMessages(newPlayerState);
        if (currentPlayer.current !== player) {
          return Promise.resolve();
        }
        if (resolveFn.current) {
          throw new Error("New playerState was emitted before last playerState was rendered.");
        }
        const promise = new Promise((resolve) => {
          resolveFn.current = resolve;
        });
        setPlayerState((currentPlayerState) => {
          if (currentPlayer.current !== player) {
            // It's unclear how we can ever get here, but it looks like React
            // doesn't properly order the `setPlayerState` call below. So we
            // need this additional check. Unfortunately this is hard to test,
            // so please make sure to manually test having an active player and
            // disconnecting from it when changing this code. Without this line
            // it will show the player as being in an active state even after
            // explicitly disconnecting it.
            return currentPlayerState;
          }
          lastActiveData.current = newPlayerState.activeData;
          return newPlayerState;
        });
        return promise;
      });
      return () => {
        currentPlayer.current = resolveFn.current = undefined;
        player.close();
        setPlayerState({
          ...defaultPlayerState(),
          activeData: lastActiveData.current,
        });
      };
    },
    [player]
  );

  const messages: ?(Message[]) = playerState.activeData ? playerState.activeData.messages : undefined;
  const topics: ?(Topic[]) = playerState.activeData ? playerState.activeData.topics : undefined;
  const frame = useMemo(() => groupBy(messages || [], "topic"), [messages]);
  const sortedTopics = useMemo(() => (topics || []).sort(naturalSort("name")), [topics]);
  const datatypes = useMemo(
    () => {
      return playerState.activeData ? playerState.activeData.datatypes : {};
    },
    [playerState.activeData && playerState.activeData.datatypes] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const setSubscriptions = useCallback(
    (id: string, subscriptionsForId: SubscribePayload[]) => {
      setAllSubscriptions((s) => ({ ...s, [id]: subscriptionsForId }));
    },
    [setAllSubscriptions]
  );
  const setPublishers = useCallback(
    (id: string, publishersForId: AdvertisePayload[]) => {
      setAllPublishers((p) => ({ ...p, [id]: publishersForId }));
    },
    [setAllPublishers]
  );
  const publish = useCallback((request: PublishPayload) => (player ? player.publish(request) : undefined), [player]);
  const startPlayback = useCallback(() => (player ? player.startPlayback() : undefined), [player]);
  const pausePlayback = useCallback(() => (player ? player.pausePlayback() : undefined), [player]);
  const setPlaybackSpeed = useCallback((speed: number) => (player ? player.setPlaybackSpeed(speed) : undefined), [
    player,
  ]);
  const seekPlayback = useCallback((time: Time) => (player ? player.seekPlayback(time) : undefined), [player]);
  return (
    <Context.Provider
      value={useShallowMemo({
        playerState,
        subscriptions,
        publishers,
        frame,
        sortedTopics,
        datatypes,
        setSubscriptions,
        setPublishers,
        publish,
        startPlayback,
        pausePlayback,
        setPlaybackSpeed,
        seekPlayback,
      })}>
      {children}
    </Context.Provider>
  );
}

type ConsumerProps = { children: (MessagePipelineContext) => React.Node };
export function MessagePipelineConsumer({ children }: ConsumerProps) {
  const value = useMessagePipeline(useCallback((ctx) => ctx, []));
  return children(value);
}

// TODO(Audrey): put messages under activeData, add ability to mock seeking
export function MockMessagePipelineProvider(props: {|
  children: React.Node,
  topics?: Topic[],
  datatypes?: RosDatatypes,
  messages?: Message[],
  setSubscriptions?: (string, SubscribePayload[]) => void,
  noActiveData?: boolean,
  activeData?: $Shape<PlayerStateActiveData>,
  capabilities?: string[],
  store?: any,
  seekPlayback?: (Time) => void,
  startTime?: Time,
  endTime?: Time,
|}) {
  const storeRef = useRef(props.store || configureStore(createRootReducer(createMemoryHistory())));
  const startTime = useRef();
  let currentTime;
  for (const message of props.messages || []) {
    if (!startTime.current || TimeUtil.isLessThan(message.receiveTime, startTime.current)) {
      startTime.current = message.receiveTime;
    }
    if (!currentTime || TimeUtil.isLessThan(currentTime, message.receiveTime)) {
      currentTime = message.receiveTime;
    }
  }

  const [allSubscriptions, setAllSubscriptions] = useState<{ [string]: SubscribePayload[] }>({});
  const flattenedSubscriptions: SubscribePayload[] = useMemo(
    () => flatten(Object.keys(allSubscriptions).map((k) => allSubscriptions[k])),
    [allSubscriptions]
  );
  const setSubscriptions = useCallback((id, subs) => setAllSubscriptions((s) => ({ ...s, [id]: subs })), [
    setAllSubscriptions,
  ]);

  const capabilities = useShallowMemo(props.capabilities || []);

  const playerState = useMemo(
    () => ({
      isPresent: true,
      playerId: "1",
      progress: {},
      showInitializing: false,
      showSpinner: false,
      capabilities,
      activeData: props.noActiveData
        ? undefined
        : {
            messages: props.messages || [],
            topics: props.topics || [],
            datatypes: props.datatypes || {},
            startTime: props.startTime || startTime.current || { sec: 100, nsec: 0 },
            currentTime: currentTime || { sec: 100, nsec: 0 },
            endTime: props.endTime || currentTime || { sec: 100, nsec: 0 },
            isPlaying: false,
            speed: 0.2,
            lastSeekTime: 0,
            ...props.activeData,
          },
    }),
    [
      capabilities,
      currentTime,
      props.messages,
      props.topics,
      props.datatypes,
      props.startTime,
      props.endTime,
      props.activeData,
      props.noActiveData,
    ]
  );

  return (
    <Provider store={storeRef.current}>
      <Context.Provider
        value={{
          playerState,
          frame: groupBy(props.messages || [], "topic"),
          sortedTopics: (props.topics || []).sort(naturalSort("name")),
          datatypes: props.datatypes || {},
          subscriptions: flattenedSubscriptions,
          publishers: [],
          setSubscriptions: props.setSubscriptions || setSubscriptions,
          setPublishers: (_, __) => {},
          publish: (_) => {},
          startPlayback: () => {},
          pausePlayback: () => {},
          setPlaybackSpeed: (_) => {},
          seekPlayback: props.seekPlayback || ((_) => {}),
        }}>
        {props.children}
      </Context.Provider>
    </Provider>
  );
}
