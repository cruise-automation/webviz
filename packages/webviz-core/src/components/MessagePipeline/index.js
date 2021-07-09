// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { debounce, flatten, groupBy, isEqual } from "lodash";
import * as React from "react";
import { type Time, TimeUtil } from "rosbag";
import shallowequal from "shallowequal";

import { pauseFrameForPromises, type FramePromise } from "./pauseFrameForPromise";
import warnOnOutOfSyncMessages from "./warnOnOutOfSyncMessages";
import signal from "webviz-core/shared/signal";
import { HoverValueProvider } from "webviz-core/src/components/HoverBar/context";
import type { GlobalVariables } from "webviz-core/src/hooks/useGlobalVariables";
import type {
  AdvertisePayload,
  Frame,
  Message,
  Player,
  PlayerState,
  PlayerStateActiveData,
  Progress,
  PublishPayload,
  SubscribePayload,
  Topic,
} from "webviz-core/src/players/types";
import StoreSetup from "webviz-core/src/stories/StoreSetup";
import { wrapMessages } from "webviz-core/src/test/datatypes";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";
import { objectValues } from "webviz-core/src/util";
import {
  type BailoutToken,
  createSelectableContext,
  useContextSelector,
  useShallowMemo,
  useShouldNotChangeOften,
} from "webviz-core/src/util/hooks";
import naturalSort from "webviz-core/src/util/naturalSort";
import sendNotification from "webviz-core/src/util/sendNotification";

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

const options = { memoResolver: shallowequal };
// Note that this selector always uses shallow memo to test whether its results are equal.
export function useMessagePipeline<T>(selector: (MessagePipelineContext) => T | BailoutToken): T {
  return useContextSelector(Context, selector, options);
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

type ProviderProps = {| children: React.Node, player?: ?Player, globalVariables?: GlobalVariables |};
export function MessagePipelineProvider({ children, player, globalVariables = {} }: ProviderProps) {
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

  const subscriptions: SubscribePayload[] = useMemo(() => flatten(objectValues(subscriptionsById)), [
    subscriptionsById,
  ]);
  const publishers: AdvertisePayload[] = useMemo(() => flatten(objectValues(publishersById)), [publishersById]);
  useEffect(() => (player ? player.setSubscriptions(subscriptions) : undefined), [player, subscriptions]);
  useEffect(() => (player ? player.setPublishers(publishers) : undefined), [player, publishers]);

  // Delay the player listener promise until rendering has finished for the latest data.
  useLayoutEffect(() => {
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
  }, [playerState]);

  useEffect(() => {
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
  }, [player]);

  const topics: ?(Topic[]) = playerState.activeData?.topics;
  useShouldNotChangeOften(topics, () => {
    sendNotification(
      "Provider topics should not change often",
      "If they do they are probably not memoized properly. Please let the Webviz team know if you see this warning.",
      "app",
      "warn"
    );
  });

  const unmemoizedDatatypes: ?RosDatatypes = playerState.activeData?.datatypes;
  useShouldNotChangeOften(unmemoizedDatatypes, () => {
    sendNotification(
      "Provider datatypes should not change often",
      "If they do they are probably not memoized properly. Please let the Webviz team know if you see this warning.",
      "app",
      "warn"
    );
  });

  const messages: ?$ReadOnlyArray<Message> = playerState.activeData?.messages;
  const frame = useMemo(() => groupBy(messages || [], "topic"), [messages]);
  const sortedTopics = useMemo(() => (topics || []).sort(), [topics]);
  const datatypes: RosDatatypes = useMemo(() => unmemoizedDatatypes ?? {}, [unmemoizedDatatypes]);
  const setSubscriptions = useCallback((id: string, subscriptionsForId: SubscribePayload[]) => {
    setAllSubscriptions((s) => {
      if (
        lastTimeWhenActiveDataBecameSet.current &&
        Date.now() < lastTimeWhenActiveDataBecameSet.current + WARN_ON_SUBSCRIPTIONS_WITHIN_TIME_MS &&
        !isEqual(
          new Set(subscriptionsForId.map(({ topic }) => topic)),
          new Set((s[id] || []).map(({ topic }) => topic))
        )
      ) {
        // TODO(JP): Might be nice to use `sendNotification` here at some point, so users can let us know about this.
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
      return { ...s, [id]: subscriptionsForId };
    });
  }, [setAllSubscriptions]);
  const setPublishers = useCallback((id: string, publishersForId: AdvertisePayload[]) => {
    setAllPublishers((p) => ({ ...p, [id]: publishersForId }));
  }, [setAllPublishers]);
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

  React.useEffect(() => {
    let skipUpdate = false;
    (async () => {
      // Wait for the current frame to finish rendering if needed
      await pauseFrameForPromises(playerTickState.current?.promisesToWaitFor ?? []);

      // If the globalVariables have already changed again while
      // we waited for the frame to render, skip the update.
      if (!skipUpdate && currentPlayer.current) {
        currentPlayer.current.setGlobalVariables(globalVariables);
      }
    })();
    return () => {
      skipUpdate = true;
    };
  }, [globalVariables]);

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

const NO_DATATYPES = Object.freeze({});

// TODO(Audrey): put messages under activeData, add ability to mock seeking
export function MockMessagePipelineProvider(props: {|
  children: React.Node,
  isPresent?: ?boolean,
  topics?: Topic[],
  datatypes?: RosDatatypes,
  messages?: Message[],
  bobjects?: Message[],
  setSubscriptions?: (string, SubscribePayload[]) => void,
  noActiveData?: boolean,
  showInitializing?: boolean,
  activeData?: ?$Shape<PlayerStateActiveData>,
  capabilities?: string[],
  store?: any,
  startPlayback?: ?() => void,
  pausePlayback?: ?() => void,
  seekPlayback?: ?(Time) => void,
  currentTime?: Time,
  startTime?: Time,
  endTime?: Time,
  isPlaying?: ?boolean,
  pauseFrame?: (string) => ResumeFrame,
  playerId?: string,
  requestBackfill?: () => void,
  progress?: Progress,
|}) {
  const startTime = useRef();
  let currentTime = props.currentTime;
  if (!currentTime) {
    for (const message of props.messages || []) {
      if (!startTime.current || TimeUtil.isLessThan(message.receiveTime, startTime.current)) {
        startTime.current = message.receiveTime;
      }
      if (!currentTime || TimeUtil.isLessThan(currentTime, message.receiveTime)) {
        currentTime = message.receiveTime;
      }
    }
  }

  const [allSubscriptions, setAllSubscriptions] = useState<{ [string]: SubscribePayload[] }>({});
  const flattenedSubscriptions: SubscribePayload[] = useMemo(() => flatten(objectValues(allSubscriptions)), [
    allSubscriptions,
  ]);
  const setSubscriptions = useCallback((id, subs) => {
    setAllSubscriptions((s) => ({ ...s, [id]: subs }));
  }, [setAllSubscriptions]);

  const requestBackfill = useMemo(() => props.requestBackfill || (() => {}), [props.requestBackfill]);

  const capabilities = useShallowMemo(props.capabilities || []);

  const playerState = useMemo(
    () => ({
      isPresent: props.isPresent == null ? true : props.isPresent,
      playerId: props.playerId == null ? "1" : props.playerId,
      progress: props.progress || {},
      showInitializing: !!props.showInitializing,
      showSpinner: false,
      capabilities,
      activeData: props.noActiveData
        ? undefined
        : {
            messages: props.messages || [],
            bobjects: props.bobjects || wrapMessages(props.messages || []),
            topics: props.topics || [],
            datatypes: props.datatypes || NO_DATATYPES,
            startTime: props.startTime || startTime.current || { sec: 100, nsec: 0 },
            currentTime: currentTime || { sec: 100, nsec: 0 },
            endTime: props.endTime || currentTime || { sec: 100, nsec: 0 },
            isPlaying: !!props.isPlaying,
            speed: 0.2,
            lastSeekTime: 0,
            ...props.activeData,
          },
    }),
    [
      props.isPresent,
      props.playerId,
      props.progress,
      props.showInitializing,
      props.noActiveData,
      props.messages,
      props.bobjects,
      props.topics,
      props.datatypes,
      props.startTime,
      props.endTime,
      props.isPlaying,
      props.activeData,
      capabilities,
      currentTime,
    ]
  );

  return (
    <StoreSetup store={props.store}>
      <HoverValueProvider>
        <Context.Provider
          value={{
            playerState,
            frame: groupBy(props.messages || [], "topic"),
            sortedTopics: (props.topics || []).sort(naturalSort("name")),
            datatypes: props.datatypes || NO_DATATYPES,
            subscriptions: flattenedSubscriptions,
            publishers: [],
            setSubscriptions: props.setSubscriptions || setSubscriptions,
            setPublishers: (_, __) => {},
            publish: (_) => {},
            startPlayback: props.startPlayback || (() => {}),
            pausePlayback: props.pausePlayback || (() => {}),
            setPlaybackSpeed: (_) => {},
            seekPlayback: props.seekPlayback || ((_) => {}),
            pauseFrame: props.pauseFrame || (() => () => {}),
            requestBackfill,
          }}>
          {props.children}
        </Context.Provider>
      </HoverValueProvider>
    </StoreSetup>
  );
}
