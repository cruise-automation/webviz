// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";

export type Topic = {|
  datatype: string,
  name: string,
  displayName?: string,
|};

export type Namespace = {|
  topic: string,
  name: string,
|};

export type Timestamp = {
  sec: number,
  nsec: number,
};

export type TypedMessage<T> = {|
  topic: string,
  datatype: string,
  op: "msg" | "message",
  receiveTime: Timestamp,
  message: T,
|};
export type Message = TypedMessage<any>;

export type TopicMsg = {| topic: string, datatype: ?string |};

export type TopicsMessage = {|
  op: "topics",
  topics: TopicMsg[],
|};

type DatatypesMessage = {|
  op: "datatypes",
  datatypes: RosDatatypes,
|};

export type PlayerState = {|
  startTime: Timestamp,
  endTime: Timestamp,
  isPlaying: boolean,
  speed: number,
|};

export type PlayerStateMessage = {|
  op: "player_state",
  start_time: Timestamp,
  end_time: Timestamp,
  playing: boolean,
  speed: number,
|};

// Most data sources should update time by passing receiveTime along with `op: "message"`,
// but when that's not possible, the current time can be updated using this op instead.
export type UpdateTimeMessage = {|
  op: "update_time",
  time: Timestamp,
|};

export type PlayerStateWithTimeMessage = {|
  ...PlayerStateMessage,
  current_time: Timestamp,
|};

type CapabilitiesMessage = {|
  op: "capabilities",
  capabilities: string[],
|};

type SubscribeMessage = {| op: "subscribe", id: number |};
type UnsubscribeMessage = {| op: "unsubscribe" |};

type SeekMessage = {| op: "seek" |};
type AuxiliaryDataMessage = {|
  op: "auxiliaryData",
  data: Object,
|};

export type Progress = { [string]: ?number };

type ProgressMessage = {|
  op: "progress",
  progress: Progress,
|};

export type DataSourceMessage =
  | Message
  | UpdateTimeMessage
  | TopicsMessage
  | DatatypesMessage
  | PlayerStateMessage
  | CapabilitiesMessage
  | SubscribeMessage
  | UnsubscribeMessage
  | ProgressMessage
  | SeekMessage
  | AuxiliaryDataMessage;

export type WebSocketDataSourceMessage =
  | Message
  | TopicsMessage
  | DatatypesMessage
  | PlayerStateWithTimeMessage
  | CapabilitiesMessage
  | SubscribeMessage
  | UnsubscribeMessage
  | SeekMessage;

export type BagWorkerMessage =
  | DataSourceMessage
  | {| op: "abort", error: {| stack?: string, code?: number |} |}
  | {| op: "connected" |}
  | {| op: "unparsedMessage", topic: string, buffer: ArrayBuffer, receiveTime: Timestamp |};

export type Frame = {
  [topic: string]: Message[],
};

export type BufferedFrame = {
  [topic: string]: Message,
};

export type SubscribePayload = {
  topic: string,
  encoding?: string,
  scale?: number,
  requester?: {| type: "panel" | "node" | "other", name: string |},
};

export type AdvertisePayload = {|
  topic: string,
  datatype: string,
  advertiser?: {| type: "panel", name: string |},
|};

export type PublishPayload = {|
  topic: string,
  msg: Object,
|};

// interface for the DataSource - both websocket and webworker based
// data sources need to implement this to plug into redux
export interface DataSource {
  // sets listener & resolves when the datasource is ready or connected
  // the listener will be called whenever the datasource has a new message available
  // for consumption.  The message callback returns a promise in case it defers
  // processing of the messages until a later time.
  setListener(callback: (DataSourceMessage) => Promise<void>): Promise<void>;

  // used to subscribe to topics
  subscribe(request: SubscribePayload): void;

  // unsubscribe from topics
  unsubscribe(request: SubscribePayload): void;

  // advertise a topic for publishing
  advertise(request: AdvertisePayload): void;
  unadvertise(request: AdvertisePayload): void;

  // publish a message on an advertised topic
  publish(request: PublishPayload): void;

  // request topics from the data source. The data source is expected
  // to eventually push a topic response message to the message listener callback
  requestTopics(): void;

  // Send a request for messages. The datasource is expected to push a response message to the listener after this.
  // It is useful for datasources that are polling based (i.e we fetch from them when we're ready to handle data).
  requestMessages(): void;

  // close the datasource
  close(): Promise<void>;

  // set a callback to be called if the data source is closed/disconnected other than via close()
  onAbort(callback: (?Error) => void): void;

  // playback control
  startPlayback(): void;
  pausePlayback(): void;
  setPlaybackSpeed(speed: number): void;
  seekPlayback(time: Timestamp): void;
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

export type DATA_SOURCE_CONNECTING = {
  type: "DATA_SOURCE_CONNECTING",
};

export type DATA_SOURCE_CONNECTED = {
  type: "DATA_SOURCE_CONNECTED",
};

export type DATA_SOURCE_DISCONNECTED = {
  type: "DATA_SOURCE_DISCONNECTED",
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
  currentTime: ?Timestamp,
};

export type TIME_UPDATED = {
  type: "TIME_UPDATED",
  time: Timestamp,
};

export type PLAYER_STATE_CHANGED = {
  type: "PLAYER_STATE_CHANGED",
  payload: PlayerState,
};

export type SET_RECONNECT_DELAY = {
  type: "SET_RECONNECT_DELAY",
  payload: number,
};

export type SEEK_PLAYBACK = {
  type: "SEEK_PLAYBACK",
  payload: Timestamp,
};

export type DATA_SOURCE_PROGRESS = {
  type: "DATA_SOURCE_PROGRESS",
  payload: Progress,
};

export type PLAYBACK_RESET = {
  type: "PLAYBACK_RESET",
  payload?: Timestamp,
};

export type CAPABILITIES_RECEIVED = {
  type: "CAPABILITIES_RECEIVED",
  capabilities: string[],
};

export interface DataSourceMetricsCollectorInterface {
  initialized(): void;
  play(): void;
  seek(): void;
  setSpeed(speed: number): void;
  pause(): void;
  recordBytesReceived(bytes: number): void;
}
