// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { Time } from "rosbag";

import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";

export type Topic = {|
  datatype: string,
  name: string,
  displayName?: string,
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

export type TopicMsg = {| topic: string, datatype: ?string, originalTopic?: string |};

export type TopicsMessage = {|
  op: "topics",
  topics: TopicMsg[],
|};

type DatatypesMessage = {|
  op: "datatypes",
  datatypes: RosDatatypes,
|};

export type PlayerStatePayload = {|
  startTime: Time,
  endTime: Time,
  isPlaying: boolean,
  speed: number,
|};

export type PlayerStateMessage = {|
  op: "player_state",
  start_time: Time,
  end_time: Time,
  playing: boolean,
  speed: number,
|};

// Most players should update time by passing receiveTime along with `op: "message"`,
// but when that's not possible, the current time can be updated using this op instead.
export type UpdateTimeMessage = {|
  op: "update_time",
  time: Time,
|};

export type PlayerStateWithTimeMessage = {|
  ...PlayerStateMessage,
  current_time: Time,
|};

type CapabilitiesMessage = {|
  op: "capabilities",
  capabilities: string[],
|};

type SubscribeMessage = {| op: "subscribe", id: number |};
type UnsubscribeMessage = {| op: "unsubscribe" |};

type SeekMessage = {| op: "seek" |};

export type Progress = { [string]: ?number };

type ProgressMessage = {|
  op: "progress",
  progress: Progress,
|};

// eslint-disable-next-line no-use-before-define
type ConnectingMessage = {| op: "connecting", player: Player |};
type ConnectedMessage = {| op: "connected" |};

export type PlayerMessage =
  | Message
  | UpdateTimeMessage
  | TopicsMessage
  | DatatypesMessage
  | PlayerStateMessage
  | CapabilitiesMessage
  | ProgressMessage
  | SeekMessage
  | ConnectingMessage
  | ConnectedMessage;

export type WebSocketPlayerMessage =
  | Message
  | TopicsMessage
  | DatatypesMessage
  | PlayerStateWithTimeMessage
  | CapabilitiesMessage
  | SubscribeMessage
  | UnsubscribeMessage
  | SeekMessage;

export type BagWorkerMessage =
  | PlayerMessage
  | {| op: "abort", error: {| stack?: string, code?: number |} |}
  | {| op: "connected" |}
  | {| op: "unparsedMessage", topic: string, buffer: ArrayBuffer, receiveTime: Time |};

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

// interface for the Player - both websocket and webworker based
// players need to implement this to plug into redux
export interface Player {
  // sets listener & resolves when the player is ready or connected
  // the listener will be called whenever the player has a new message available
  // for consumption.  The message callback returns a promise in case it defers
  // processing of the messages until a later time.
  setListener(callback: (PlayerMessage) => Promise<void>): Promise<void>;

  // Set a new set of subscriptions/advertisers.
  setSubscriptions(subscriptions: SubscribePayload[]): void;
  setPublishers(publishers: AdvertisePayload[]): void;

  // publish a message on an advertised topic
  publish(request: PublishPayload): void;

  // Send a request for messages. The player is expected to push a response message to the listener after this.
  // It is useful for players that are polling based (i.e we fetch from them when we're ready to handle data).
  requestMessages(): void;

  // close the player
  close(): Promise<void>;

  // playback control
  startPlayback(): void;
  pausePlayback(): void;
  setPlaybackSpeed(speed: number): void;
  seekPlayback(time: Time): void;
}

// redux action types follow:
export type SUBSCRIPTIONS_CHANGED = {
  type: "SUBSCRIPTIONS_CHANGED",
  subscriptions: SubscribePayload[],
};

export type PUBLISHERS_CHANGED = {
  type: "PUBLISHERS_CHANGED",
  publishers: AdvertisePayload[],
};

export type SET_WEBSOCKET_INPUT = {
  type: "SET_WEBSOCKET_INPUT",
  payload: string,
};

export type PLAYER_CONNECTING = {
  type: "PLAYER_CONNECTING",
};

export type PLAYER_CONNECTED = {
  type: "PLAYER_CONNECTED",
};

export type PLAYER_DISCONNECTED = {
  type: "PLAYER_DISCONNECTED",
};

export type TOPICS_RECEIVED = {
  type: "TOPICS_RECEIVED",
  payload: Topic[],
};

export type DATATYPES_RECEIVED = {
  type: "DATATYPES_RECEIVED",
  payload: RosDatatypes,
};

export type FRAME_RECEIVED = {
  type: "FRAME_RECEIVED",
  frame: Frame,
  currentTime: ?Time,
};

export type TIME_UPDATED = {
  type: "TIME_UPDATED",
  time: Time,
};

export type PLAYER_STATE_CHANGED = {
  type: "PLAYER_STATE_CHANGED",
  payload: PlayerStatePayload,
};

export type SET_RECONNECT_DELAY = {
  type: "SET_RECONNECT_DELAY",
  payload: number,
};

export type SEEK_PLAYBACK = {
  type: "SEEK_PLAYBACK",
  payload: Time,
};

export type PLAYER_PROGRESS = {
  type: "PLAYER_PROGRESS",
  payload: Progress,
};

export type PLAYBACK_RESET = {
  type: "PLAYBACK_RESET",
  payload?: Time,
};

export type CAPABILITIES_RECEIVED = {
  type: "CAPABILITIES_RECEIVED",
  capabilities: string[],
};

export interface PlayerMetricsCollectorInterface {
  initialized(): void;
  play(): void;
  seek(): void;
  setSpeed(speed: number): void;
  pause(): void;
  recordBytesReceived(bytes: number): void;
}
