// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { createMemoryHistory } from "history";
import { debounce, flatten, groupBy } from "lodash";
import * as React from "react";
import { Provider } from "react-redux";
import { type Time, TimeUtil } from "rosbag";

import { pauseFrameForPromises, type FramePromise } from "./pauseFrameForPromise";
import warnOnOutOfSyncMessages from "./warnOnOutOfSyncMessages";
import signal from "webviz-core/shared/signal";
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
import { hideLoadingLogo } from "webviz-core/src/util/hideLoadingLogo";
import {
  type BailoutToken,
  createSelectableContext,
  useContextSelector,
  useShallowMemo,
  useShouldNotChangeOften,
} from "webviz-core/src/util/hooks";
import naturalSort from "webviz-core/src/util/naturalSort";
import reportError from "webviz-core/src/util/reportError";

export const WARN_ON_SUBSCRIPTIONS_WITHIN_TIME_MS = 1000;

const { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } = React;

type ResumeFrame = () => void;
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
  // Don't render the next frame until the returned function has been called.
  pauseFrame(name: string): ResumeFrame,
  requestBackfill(): void,
|};

const Context = createSelectableContext<MessagePipelineContext>();

export function useMessagePipeline<T>(selector: (MessagePipelineContext) => T | BailoutToken): T {
  return useContextSelector(Context, selector);
}

function defaultPlayerState(): PlayerState {
  return {
    isPresent: false,
    showSpinner: true,
    showInitializing: true,
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
  const lastTimeWhenActiveDataBecameSet = useRef<?number>();
  const [subscriptionsById, setAllSubscriptions] = useState<{ [string]: SubscribePayload[] }>({});
  const [publishersById: AdvertisePayload[], setAllPublishers: (AdvertisePayload[]) => void] = useState({});
  // This is the state of the current tick of the player.
  // This state is tied to the player, and should be replaced whenever the player changes.
  const playerTickState = useRef<{|
    // Call this to resolve the current tick. If this doesn't exist, there isn't a tick currently rendering.
    resolveFn: ?() => void,
    // Promises to halt the current tick for.
    promisesToWaitFor: FramePromise[],
    waitingForPromises: boolean,
  |}>({ resolveFn: undefined, promisesToWaitFor: [], waitingForPromises: false });

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
      if (playerTickState.current) {
        // In certain cases like the player being replaced (reproduce by dragging a bag in while playing), we can
        // replace the new playerTickState. We want to use one playerTickState throughout the entire tick, since it's
        // implicitly tied to the player.
        const currentPlayerTickState = playerTickState.current;
        // $FlowFixMe it doesn't matter if this function returns a promise.
        requestAnimationFrame(async () => {
          if (currentPlayerTickState.resolveFn && !currentPlayerTickState.waitingForPromises) {
            if (currentPlayerTickState.promisesToWaitFor.length) {
              // If we have finished rendering but we still have to wait for some promises wait for them here.

              const promises = currentPlayerTickState.promisesToWaitFor;
              currentPlayerTickState.promisesToWaitFor = [];
              currentPlayerTickState.waitingForPromises = true;
              // If `pauseFrame` is called while we are waiting for any other promises, they just wait for the frame
              // after the current one.
              await pauseFrameForPromises(promises);

              currentPlayerTickState.waitingForPromises = false;
              if (currentPlayerTickState.resolveFn) {
                currentPlayerTickState.resolveFn();
                currentPlayerTickState.resolveFn = undefined;
              }
            } else {
              currentPlayerTickState.resolveFn();
              currentPlayerTickState.resolveFn = undefined;
            }
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
      // Create a new PlayerTickState when the player is replaced.
      playerTickState.current = { resolveFn: undefined, promisesToWaitFor: [], waitingForPromises: false };

      player.setListener((newPlayerState: PlayerState) => {
        warnOnOutOfSyncMessages(newPlayerState);
        if (currentPlayer.current !== player) {
          return Promise.resolve();
        }
        if (playerTickState.current.resolveFn) {
          throw new Error("New playerState was emitted before last playerState was rendered.");
        }
        const promise = new Promise((resolve) => {
          playerTickState.current.resolveFn = resolve;
        });

        const { showInitializing, isPresent } = newPlayerState;

        if (!isPresent || !showInitializing) {
          hideLoadingLogo();
        }

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
          if (!lastActiveData.current && newPlayerState.activeData) {
            lastTimeWhenActiveDataBecameSet.current = Date.now();
          }
          lastActiveData.current = newPlayerState.activeData;
          return newPlayerState;
        });
        return promise;
      });
      return () => {
        currentPlayer.current = playerTickState.current.resolveFn = undefined;
        player.close();
        setPlayerState({
          ...defaultPlayerState(),
          activeData: lastActiveData.current,
        });
      };
    },
    [player]
  );

  const topics: ?(Topic[]) = playerState.activeData?.topics;
  useShouldNotChangeOften(topics, () => {
    reportError(
      "Provider topics should not change often",
      "If they do they are probably not memoized properly. Please let the Webviz team know if you see this error.",
      "app"
    );
  });

  const unmemoizedDatatypes: ?RosDatatypes = playerState.activeData?.datatypes;
  useShouldNotChangeOften(unmemoizedDatatypes, () => {
    reportError(
      "Provider datatypes should not change often",
      "If they do they are probably not memoized properly. Please let the Webviz team know if you see this error.",
      "app"
    );
  });

  const messages: ?(Message[]) = playerState.activeData?.messages;
  const frame = useMemo(() => groupBy(messages || [], "topic"), [messages]);
  const sortedTopics = useMemo(() => (topics || []).sort(naturalSort("name")), [topics]);
  const datatypes: RosDatatypes = useMemo(() => unmemoizedDatatypes ?? {}, [unmemoizedDatatypes]);
  const setSubscriptions = useCallback(
    (id: string, subscriptionsForId: SubscribePayload[]) => {
      setAllSubscriptions((s) => ({ ...s, [id]: subscriptionsForId }));

      if (
        lastTimeWhenActiveDataBecameSet.current &&
        Date.now() < lastTimeWhenActiveDataBecameSet.current + WARN_ON_SUBSCRIPTIONS_WITHIN_TIME_MS
      ) {
        // TODO(JP): Might be nice to use `reportError` here at some point, so users can let us know about this.
        // However, there is currently a race condition where a layout can get loaded just after the player
        // initializes. I'm not too sure how to prevent that, because we also don't want to ignore whenever the
        // layout changes, since a panel might decide to save its config when data becomes available, and that is
        // bad behaviour by itself too.
        console.warn(
          `Panel subscribed right after Player loaded, which causes unnecessary requests. Please let the Webviz team know about this. Topics: ${subscriptionsForId
            .map(({ topic }) => topic)
            .join(", ")}`
        );
      }
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
  const pauseFrame = useCallback((name: string) => {
    const promise = signal();
    playerTickState.current.promisesToWaitFor.push({ name, promise });
    return () => {
      promise.resolve();
    };
  }, []);
  const requestBackfill = useMemo(() => debounce(() => (player ? player.requestBackfill() : undefined)), [player]);

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
        pauseFrame,
        requestBackfill,
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
  pauseFrame?: (string) => ResumeFrame,
  playerId?: string,
  requestBackfill?: () => void,
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

  const requestBackfill = useMemo(() => props.requestBackfill || (() => {}), [props.requestBackfill]);

  const capabilities = useShallowMemo(props.capabilities || []);

  const playerState = useMemo(
    () => ({
      isPresent: true,
      playerId: props.playerId || "1",
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
      props.playerId,
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
          pauseFrame: props.pauseFrame || (() => () => {}),
          requestBackfill,
        }}>
        {props.children}
      </Context.Provider>
    </Provider>
  );
}
