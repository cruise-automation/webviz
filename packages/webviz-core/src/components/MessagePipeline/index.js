// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { flatten, groupBy } from "lodash";
import * as React from "react"; // eslint-disable-line import/no-duplicates
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useContext } from "react"; // eslint-disable-line import/no-duplicates
import { Provider } from "react-redux";
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

export function useMessagePipeline(): MessagePipelineContext {
  const context = useContext(Context);
  if (!context) {
    throw new Error("Component must be nested within a <MessagePipelineProvider> to access the message pipeline.");
  }
  return context;
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
  return (
    <Context.Provider
      value={{
        playerState,
        subscriptions,
        publishers,
        frame: useMemo(() => groupBy(messages || [], "topic"), [messages]),
        sortedTopics: useMemo(() => (topics || []).sort(naturalSort("name")), [topics]),
        datatypes: useMemo(
          () => {
            return playerState.activeData ? playerState.activeData.datatypes : {};
          },
          [playerState.activeData && playerState.activeData.datatypes] // eslint-disable-line react-hooks/exhaustive-deps
        ),
        setSubscriptions: useCallback(
          (id: string, subscriptionsForId: SubscribePayload[]) => {
            setAllSubscriptions((s) => ({ ...s, [id]: subscriptionsForId }));
          },
          [setAllSubscriptions]
        ),
        setPublishers: useCallback(
          (id: string, publishersForId: AdvertisePayload[]) => {
            setAllPublishers((p) => ({ ...p, [id]: publishersForId }));
          },
          [setAllPublishers]
        ),
        publish: useCallback((request: PublishPayload) => (player ? player.publish(request) : undefined), [player]),
        startPlayback: useCallback(() => (player ? player.startPlayback() : undefined), [player]),
        pausePlayback: useCallback(() => (player ? player.pausePlayback() : undefined), [player]),
        setPlaybackSpeed: useCallback((speed: number) => (player ? player.setPlaybackSpeed(speed) : undefined), [
          player,
        ]),
        seekPlayback: useCallback((time: Time) => (player ? player.seekPlayback(time) : undefined), [player]),
      }}>
      {children}
    </Context.Provider>
  );
}

type ConsumerProps = { children: (MessagePipelineContext) => React.Node };
export function MessagePipelineConsumer({ children }: ConsumerProps) {
  const value = useMessagePipeline();
  return children(value);
}

export function MockMessagePipelineProvider(props: {|
  children: React.Node,
  topics?: Topic[],
  datatypes?: RosDatatypes,
  messages?: Message[],
  setSubscriptions?: (string, SubscribePayload[]) => void,
  activeData?: $Shape<PlayerStateActiveData>,
  capabilities?: string[],
  store?: any,
  seekPlayback?: (Time) => void,
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
          seekPlayback: props.seekPlayback || ((_) => {}),
        }}>
        {props.children}
      </Context.Provider>
    </Provider>
  );
}
