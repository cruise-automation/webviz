// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { flatten, groupBy } from "lodash";
import * as React from "react";
import { Provider } from "react-redux";
import withHooks, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react-with-hooks";
import { type Time, TimeUtil } from "rosbag";

import warnOnOutOfSyncMessages from "./warnOnOutOfSyncMessages";
import rootReducer from "webviz-core/src/reducers";
import configureStore from "webviz-core/src/store/configureStore";
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
} from "webviz-core/src/types/players";
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

const Context: React.Context<?MessagePipelineContext> = React.createContext();

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

type ProviderProps = {| children: React.Node, player: ?Player |};
export const MessagePipelineProvider = withHooks(function MessagePipelineProvider({ children, player }: ProviderProps) {
  const playerId: {| current: string |} = useRef(defaultPlayerState().playerId);
  const [playerState: PlayerState, setPlayerState: (PlayerState) => void] = useState(defaultPlayerState);
  const [subscriptionsById: SubscribePayload[], setAllSubscriptions: (SubscribePayload[]) => void] = useState({});
  const [publishersById: AdvertisePayload[], setAllPublishers: (AdvertisePayload[]) => void] = useState({});
  const resolveFn: {| current: ?() => void |} = useRef(undefined);

  const subscriptions: SubscribePayload[] = useMemo(() => flatten(Object.values(subscriptionsById)), [
    subscriptionsById,
  ]);
  const publishers: AdvertisePayload[] = useMemo(() => flatten(Object.values(publishersById)), [publishersById]);
  useEffect(() => player && player.setSubscriptions(subscriptions), [player, subscriptions]);
  useEffect(() => player && player.setPublishers(publishers), [player, publishers]);

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
      if (playerId.current) {
        playerId.current = "";
        if (resolveFn.current) {
          resolveFn.current();
          resolveFn.current = undefined;
        }
        setPlayerState(defaultPlayerState());
      }
      if (!player) {
        return;
      }
      player.setListener((newPlayerState: PlayerState) => {
        warnOnOutOfSyncMessages(newPlayerState);
        if (playerId.current === "") {
          playerId.current = newPlayerState.playerId;
        }
        if (newPlayerState.playerId !== playerId.current) {
          return Promise.resolve();
        }
        if (resolveFn.current) {
          throw new Error("New playerState was emitted before last playerState was rendered.");
        }
        const promise = new Promise((resolve) => {
          resolveFn.current = resolve;
        });
        setPlayerState(newPlayerState);
        return promise;
      });
      return () => player.close();
    },
    [player]
  );

  const messages: ?(Message[]) = playerState.activeData ? playerState.activeData.messages : undefined;
  const topics: ?(Topic[]) = playerState.activeData ? playerState.activeData.topics : undefined;

  return (
    <Context.Provider
      value={{
        playerState,
        subscriptions,
        publishers,
        frame: useMemo(() => groupBy(messages || [], "topic"), [messages]),
        sortedTopics: useMemo(() => (topics || []).sort(naturalSort("name")), [topics]),
        datatypes: useMemo(() => (playerState.activeData ? playerState.activeData.datatypes : {}), [
          playerState.activeData && playerState.activeData.datatypes,
        ]),
        setSubscriptions: useCallback((id: string, subscriptionsForId: SubscribePayload[]) => {
          setAllSubscriptions((s) => ({ ...s, [id]: subscriptionsForId }));
        }),
        setPublishers: useCallback((id: string, publishersForId: AdvertisePayload[]) => {
          setAllPublishers((p) => ({ ...p, [id]: publishersForId }));
        }),
        publish: useCallback((request: PublishPayload) => player && player.publish(request)),
        startPlayback: useCallback(() => player && player.startPlayback()),
        pausePlayback: useCallback(() => player && player.pausePlayback()),
        setPlaybackSpeed: useCallback((speed: number) => player && player.setPlaybackSpeed(speed)),
        seekPlayback: useCallback((time: Time) => player && player.seekPlayback(time)),
      }}>
      {children}
    </Context.Provider>
  );
});

// TODO(JP): Use `useContext` here when https://github.com/yesmeck/react-with-hooks/issues/3
// gets fixed.
type ConsumerProps = { children: (MessagePipelineContext) => React.Node };
export const MessagePipelineConsumer = withHooks(function MessagePipelineConsumer({ children }: ConsumerProps) {
  return (
    <Context.Consumer>
      {(value) => {
        if (!value) {
          throw new Error("<MessagePipelineConsumer> must be nested within a <MessagePipelineProvider>");
        }
        return children(value);
      }}
    </Context.Consumer>
  );
});

export const MockMessagePipelineProvider = withHooks(function MockMessagePipelineProvider(props: {|
  children: React.Node,
  topics?: Topic[],
  datatypes?: RosDatatypes,
  messages?: Message[],
  setSubscriptions?: (string, SubscribePayload[]) => void,
  activeData?: $Shape<PlayerStateActiveData>,
  capabilities?: string[],
  store?: any,
|}) {
  const storeRef = useRef(props.store || configureStore(rootReducer));

  let startTime, currentTime;
  for (const message of props.messages || []) {
    if (!startTime || TimeUtil.isLessThan(message.receiveTime, startTime)) {
      startTime = message.receiveTime;
    }
    if (!currentTime || TimeUtil.isLessThan(currentTime, message.receiveTime)) {
      currentTime = message.receiveTime;
    }
  }

  return (
    <Provider store={storeRef.current}>
      <Context.Provider
        value={{
          playerState: {
            isPresent: true,
            playerId: "1",
            progress: {},
            showInitializing: false,
            showSpinner: false,
            capabilities: props.capabilities || [],
            activeData: {
              messages: props.messages || [],
              topics: props.topics || [],
              datatypes: props.datatypes || {},
              startTime: startTime || { sec: 100, nsec: 0 },
              currentTime: currentTime || { sec: 100, nsec: 0 },
              endTime: currentTime || { sec: 100, nsec: 0 },
              isPlaying: false,
              speed: 0.2,
              lastSeekTime: 0,
              ...props.activeData,
            },
          },
          frame: groupBy(props.messages || [], "topic"),
          sortedTopics: (props.topics || []).sort(naturalSort("name")),
          datatypes: props.datatypes || {},
          subscriptions: [],
          publishers: [],
          setSubscriptions: props.setSubscriptions || ((_, __) => {}),
          setPublishers: (_, __) => {},
          publish: (_) => {},
          startPlayback: () => {},
          pausePlayback: () => {},
          setPlaybackSpeed: (_) => {},
          seekPlayback: (_) => {},
        }}>
        {props.children}
      </Context.Provider>
    </Provider>
  );
});
