// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { Time } from "rosbag";

import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";
import type { Range } from "webviz-core/src/util/ranges";

export type Topic = {|
  datatype: string,
  name: string,
  originalTopic?: string,
|};

export type Namespace = {|
  topic: string,
  name: string,
|};

export type TypedMessage<T> = {|
  topic: string,
  datatype: string,
  op: "message",
  receiveTime: Time,
  message: T,
|};
export type Message = TypedMessage<any>;

type TopicsMessage = {|
  op: "topics",
  topics: {| topic: string, datatype: ?string |}[],
|};
type DatatypesMessage = {|
  op: "datatypes",
  datatypes: RosDatatypes,
|};
type PlayerStateWithTimeMessage = {|
  op: "player_state",
  start_time: Time,
  end_time: Time,
  playing: boolean,
  speed: number,
  current_time: Time,
|};
type CapabilitiesMessage = {|
  op: "capabilities",
  capabilities: string[],
|};
type SubscribeMessage = {| op: "subscribe", id: number |};
type UnsubscribeMessage = {| op: "unsubscribe" |};
type SeekMessage = {| op: "seek" |};

export type WebSocketPlayerMessage =
  | Message
  | TopicsMessage
  | DatatypesMessage
  | PlayerStateWithTimeMessage
  | CapabilitiesMessage
  | SubscribeMessage
  | UnsubscribeMessage
  | SeekMessage;

export type Progress = {
  // Percentages by topic. Currently only used by the old Airavata code path,
  // should be considered deprecated.
  percentageByTopic?: { [string]: ?number },

  // Used to show progress bar. Ranges are fractions, e.g. `{ start: 0, end: 0.5 }`.
  fullyLoadedFractionRanges?: Range[],

  // Time ranges in nanoseconds since bag start per topic. Used by
  // `IdbCacheReaderDataProvider` to determine if a range is already available
  // in IndexedDB. Is not directly shown in the UI.
  nsTimeRangesSinceBagStart?: { [string]: Range[] },
};

export type Frame = {
  [topic: string]: Message[],
};

export type BufferedFrame = {
  [topic: string]: Message,
};

// TODO(JP): Pull this into two types, one for the Player (which does not care about the
// `requester`) and one for the Internals panel (which does).
export type SubscribePayload = {
  topic: string,
  encoding?: string, // TODO(JP): Remove and derive from `scale` (= "image/compressed").
  scale?: number,
  requester?: {| type: "panel" | "node" | "other", name: string |},
};

// TODO(JP): Pull this into two types, one for the Player (which does not care about the
// `advertiser`) and one for the Internals panel (which does).
export type AdvertisePayload = {|
  topic: string,
  datatype: string,
  advertiser?: {| type: "panel", name: string |},
|};

export type PublishPayload = {|
  topic: string,
  msg: Object,
|};

export const PlayerCapabilities = {
  advertise: "advertise",
  initialization: "initialization",
};

export type PlayerStateActiveData = {|
  messages: Message[],
  currentTime: Time,
  startTime: Time,
  endTime: Time,
  isPlaying: boolean,
  speed: number,
  lastSeekTime: number,
  topics: Topic[],
  datatypes: RosDatatypes,
|};

export type PlayerState = {|
  isPresent: boolean,
  showSpinner: boolean,
  showInitializing: boolean,
  progress: Progress,
  capabilities: $Values<typeof PlayerCapabilities>[],
  playerId: string,
  activeData: ?PlayerStateActiveData,
|};

export interface Player {
  setListener(listener: (PlayerState) => Promise<void>): void;
  close(): void;

  // Set a new set of subscriptions/advertisers.
  setSubscriptions(subscriptions: SubscribePayload[]): void;
  setPublishers(publishers: AdvertisePayload[]): void;

  // publish a message on an advertised topic
  publish(request: PublishPayload): void;

  // playback control
  startPlayback(): void;
  pausePlayback(): void;
  setPlaybackSpeed(speed: number): void;
  seekPlayback(time: Time): void;
}

export interface PlayerMetricsCollectorInterface {
  initialized(): void;
  play(speed: number): void;
  seek(time: Time): void;
  setSpeed(speed: number): void;
  pause(): void;
  close(): void;
  recordBytesReceived(bytes: number): void;
  recordPlaybackTime(time: Time): void;
}
