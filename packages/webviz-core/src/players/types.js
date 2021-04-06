// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { Time, RosMsgDefinition } from "rosbag";

import type { BlockCache } from "webviz-core/src/dataProviders/MemoryCacheDataProvider";
import type {
  AverageThroughput,
  DataProviderStall,
  InitializationPerformanceMetadata,
} from "webviz-core/src/dataProviders/types";
import { type GlobalVariables } from "webviz-core/src/hooks/useGlobalVariables";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";
import type { Range } from "webviz-core/src/util/ranges";
import type { TimestampMethod } from "webviz-core/src/util/time";

export type RequireAuthAsk = {| type: "requireAuthAsk" |};
export type RequireAuthReply = {| type: "requireAuthReply", data: string |};
export type NotifyPlayerManagerData = RequireAuthAsk;
export type NotifyPlayerManagerReplyData = RequireAuthReply;
export type NotifyPlayerManager = (NotifyPlayerManagerData) => Promise<?NotifyPlayerManagerReplyData>;

export type MessageDefinitionsByTopic = { [topic: string]: string };
export type ParsedMessageDefinitionsByTopic = { [topic: string]: RosMsgDefinition[] };

// A `Player` is a class that manages playback state. It manages subscriptions,
// current time, which topics and datatypes are available, and so on.
// For more details, see the types below.

// We disable no-use-before-define so we can have the most important types at the top.
/* eslint-disable no-use-before-define */
export interface Player {
  // The main way to get information out the player is to set a listener. This listener will be
  // called whenever the PlayerState changes, so that we can render the new state to the UI. Users
  // should return a promise from the listener that resolves when the UI has finished updating, so
  // that we don't get overwhelmed with new state that we can't keep up with. The Player is
  // responsible for appropriately throttling based on when we resolve this promise.
  setListener(listener: (PlayerState) => Promise<void>): void;

  // Close the player; i.e. terminate any connections it might have open.
  close(): void;

  // Set a new set of subscriptions/advertisers. This might trigger fetching
  // new data, which might in turn trigger a backfill of messages.
  setSubscriptions(subscriptions: SubscribePayload[]): void;
  setPublishers(publishers: AdvertisePayload[]): void;

  // If the Player supports publishing (i.e. PlayerState#capabilities contains
  // PlayerCapabilities.advertise), publish a message.
  publish(request: PublishPayload): void;

  // Basic playback controls.
  startPlayback(): void;
  pausePlayback(): void;
  seekPlayback(time: Time, backfillDuration: ?Time): void; // Seek to a particular time. Might trigger backfilling.

  // If the Player supports non-real-time speeds (i.e. PlayerState#capabilities contains
  // PlayerCapabilities.setSpeed), set that speed. E.g. 1.0 is real time, 0.2 is 20% of real time.
  setPlaybackSpeed(speedFraction: number): void;

  // Request a backfill for Players that support it. Allowed to be a no-op if the player does not
  // support backfilling, or if it's already playing (in which case we'd get new messages soon anyway).
  // This is currently called after subscriptions changed. We do our best in the MessagePipeline to
  // not call this method too often (e.g. it's debounced).
  // TODO(JP): We can't call this too often right now, since it clears out all existing data in
  // panels, so e.g. the Plot panel which might have a lot of data loaded would get cleared to just
  // a small backfilled amount of data. We should somehow make this more granular.
  requestBackfill(): void;

  // Set the globalVariables for Players that support it.
  // This is generally used to pass new globalVariables to the UserNodePlayer
  setGlobalVariables(globalVariables: GlobalVariables): void;

  setMessageOrder(order: TimestampMethod): void;
}

export type PlayerState = {|
  // Is there a real Player set at all. Should be set to `false` when initializing a PlayerState outside of an actual player.
  isPresent: boolean,

  // Show a spinner in the UI (indicating making some sort of connection).
  showSpinner: boolean,

  // Show "initializing" instead of a playback bar at the bottom of the screen.
  showInitializing: boolean,

  // Show some sort of progress indication in the playback bar; see `type Progress` for more details.
  // TODO(JP): Maybe we should unify some progress and the other initialization fields above into
  // one "status" object?
  progress: Progress,

  // Capabilities of this particular `Player`, which are not shared across all players.
  // See `const PlayerCapabilities` for more details.
  capabilities: $Values<typeof PlayerCapabilities>[],

  // A unique id for this player (typically a UUID generated on construction). This is used to clear
  // out any data when switching to a new player.
  playerId: string,

  // The actual data to render panels with. Can be empty during initialization, until all this data
  // is known. See `type PlayerStateActiveData` for more details.
  activeData: ?PlayerStateActiveData,
|};

export type PlayerWarnings = $ReadOnly<{|
  topicsWithoutHeaderStamps?: $ReadOnlyArray<string>,
|}>;

export type PlayerStateActiveData = {|
  // An array of (ROS-like) messages that should be rendered. Should be ordered by `receiveTime`,
  // and should be immediately following the previous array of messages that was emitted as part of
  // this state. If there is a discontinuity in messages, `lastSeekTime` should be different than
  // the previous state. Panels collect these messages using the `PanelAPI`.
  messages: $ReadOnlyArray<Message>,
  bobjects: $ReadOnlyArray<BobjectMessage>,
  totalBytesReceived: number, // always-increasing

  // The current playback position, which will be shown in the playback bar. This time should be
  // equal to or later than the latest `receiveTime` in `messages`. Why not just use
  // `last(messages).receiveTime`? The reason is that the data source (e.g. ROS bag) might have
  // empty sections, i.e. `messages` can be empty, but we still want to be able to show a playback
  // cursor moving forward during these regions.
  currentTime: Time,

  // The start time to show in the playback bar. Every `message.receiveTime` (and therefore
  // `currentTime`) has to later than or equal to `startTime`.
  startTime: Time,

  // The end time to show in the playback bar. Every `message.receiveTime` (and therefore
  // `currentTime`) has to before than or equal to `endTime`.
  endTime: Time,

  // Whether or not we're currently playing back. Controls the play/pause icon in the playback bar.
  // It's still allowed to emit `messages` even when not playing (e.g. when doing a backfill after
  // a seek).
  isPlaying: boolean,

  // If the Player supports non-real-time speeds (i.e. PlayerState#capabilities contains
  // PlayerCapabilities.setSpeed), this represents that speed as a fraction of real time.
  // E.g. 1.0 is real time, 0.2 is 20% of real time.
  speed: number,

  // The order in which messages are published.
  messageOrder: TimestampMethod,

  // The last time a seek / discontinuity in messages happened. This will clear out data within
  // `PanelAPI` so we're not looking at stale data.
  // TODO(JP): This currently is a time per `Date.now()`, but we don't need that anywhere, so we
  // should change this to a `resetMessagesId` where you just have to set it to a unique id (better
  // to have an id than a boolean, in case the listener skips parsing a state for some reason).
  lastSeekTime: number,

  // A list of topics that panels can subscribe to. This list may change across states,
  // but when a topic is removed from the list we should treat it as a seek (i.e. lastSeekTime
  // should be bumped). Also, no messages are allowed to be emitted which have a `topic` field that
  // isn't represented in this list. Finally, every topic must have a `datatype` which is actually
  // present in the `datatypes` field (see below).
  topics: Topic[],

  // A complete list of ROS datatypes. Allowed to change. But it must always be "complete" (every
  // topic must refer to a datatype that is present in this list, every datatypes that refers to
  // another datatype must refer to a datatype that is present in this list).
  datatypes: RosDatatypes,

  // Used for late-parsing of binary messages. Required to cover any topic for which binary data is
  // given to panels. (May be empty for players that only provide messages parsed into objects.)
  parsedMessageDefinitionsByTopic: ParsedMessageDefinitionsByTopic,

  // Used for communicating potential issues that surface during playback.
  playerWarnings: PlayerWarnings,
|};

// Represents a ROS topic, though the actual data does not need to come from a ROS system.
export type Topic = {|
  // Of ROS topic format, i.e. "/some/topic". We currently depend on this slashes format a bit in
  // `<MessageHistroy>`, though we could relax this and support arbitrary strings. It's nice to have
  // a consistent representation for topics that people recognize though.
  name: string,
  // Name of the datatype (see `type PlayerStateActiveData` for details).
  datatype: string,
  // The original topic name, if the topic name was at some point renamed, e.g. in
  // RenameDataProvider.
  originalTopic?: string,
  // The number of messages present on the topic. Valid only for sources with a fixed number of
  // messages, such as bags.
  numMessages?: number,
  // Whether the data can appear in the preloaded blocks. Authoritative if present -- this field
  // will be set by the player to allow for optimizations in the PanelAPI and panels.
  preloadable?: boolean,
  // For our respective NodePlayers to publish their nodes' input topics.
  inputTopics?: string[],
|};

// A ROS-like message.
export type TypedMessage<T> = $ReadOnly<{|
  topic: string,
  receiveTime: Time,

  // The actual message format. This is currently not very tightly defined, but it's typically
  // JSON-serializable, with the exception of typed arrays
  // (see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Typed_arrays).
  message: $ReadOnly<T>,
|}>;
export type Message = TypedMessage<any>;

type RosSingularField = number | string | boolean | RosObject; // No time -- consider it a message.
export type RosValue = RosSingularField | $ReadOnlyArray<RosSingularField> | Uint8Array | Int8Array | void | null;
export type RosObject = $ReadOnly<{ [property: string]: RosValue }>;

// Keeping 'Bobject' opaque here ensures that we're not mixing and matching
// parsed messages with Bobjects.
export opaque type Bobject = {};

// Split from `TypedMessage` because $ReadOnly<> disagrees with the opaque Bobject type and mixed.
export type OpaqueMessage<T> = $ReadOnly<{|
  topic: string,
  receiveTime: Time,
  message: T,
|}>;
export type BobjectMessage = OpaqueMessage<Bobject>;
export type ReflectiveMessage = OpaqueMessage<mixed>;
export const cast = <T>(message: $ReadOnly<RosObject> | Bobject | mixed): T => ((message: any): T);

// Contains different kinds of progress indications, mostly used in the playback bar.
export type Progress = $ReadOnly<{|
  // Used to show progress bar. Ranges are fractions, e.g. `{ start: 0, end: 0.5 }`.
  fullyLoadedFractionRanges?: Range[],

  // Time ranges in nanoseconds since bag start per topic. Used by
  // `IdbCacheReaderDataProvider` to determine if a range is already available
  // in IndexedDB. Is not directly shown in the UI.
  nsTimeRangesSinceBagStart?: { [string]: Range[] },

  // A raw view into the cached binary data stored by the MemoryCacheDataProvider. Only present when
  // using the RandomAccessPlayer.
  messageCache?: BlockCache,
|}>;

// TODO(JP): Deprecated; just inline this type wherever needed.
export type Frame = {
  [topic: string]: Message[],
};

export type MessageFormat = "parsedMessages" | "bobjects";

// Represents a subscription to a single topic, for use in `setSubscriptions`.
// TODO(JP): Pull this into two types, one for the Player (which does not care about the
// `requester`) and one for the Internals panel (which does).
export type SubscribePayload = {|
  // The topic name to subscribe to.
  topic: string,

  // A particular requested encoding.
  // TODO(JP): Remove and derive from `scale` (= "image/compressed").
  encoding?: string,

  // Currently only used for images. Used for compressing the image.
  scale?: ?number,

  // Optionally, where the request came from. Used in the "Internals" panel to improve debugging.
  requester?: {| type: "panel" | "node" | "other", name: string |},

  // If all subscriptions for this topic have this flag set, and the topic is available in
  // PlayerState#Progress#blocks, the message won't be included in PlayerStateActiveData#messages.
  // This is used by parsed-message subscribers to avoid parsing the messages at playback time when
  // possible. Note: If there are other subscriptions without this flag set, the messages may still
  // be delivered to the fallback subscriber.
  preloadingFallback?: boolean,
  format: MessageFormat,
|};

// Represents a single topic publisher, for use in `setPublishers`.
// TODO(JP): Rename to `PublisherPayload`.
// TODO(JP): Pull this into two types, one for the Player (which does not care about the
// `advertiser`) and one for the Internals panel (which does).
export type AdvertisePayload = {|
  // The topic name. Currently there is no hard requirement on whether or not this topic already
  // exists.
  topic: string,

  // The datatype name. Must already exist in `datatypes`.
  datatype: string,

  // Optionally, where the request came from. Used in the "Internals" panel to improve debugging.
  advertiser?: {| type: "panel", name: string |},
|};

// The actual message to publish.
export type PublishPayload = {| topic: string, msg: any |};

// Capabilities that are not shared by all players.
export const PlayerCapabilities = {
  // Publishing messages. Need to be connected to some sort of live robotics system (e.g. ROS).
  advertise: "advertise",

  // Setting speed to something that is not real time.
  setSpeed: "setSpeed",
};

// A metrics collector is an interface passed into a `Player`, which will get called when certain
// events happen, so we can track those events in some metrics system.
export interface PlayerMetricsCollectorInterface {
  playerConstructed(): void;
  initialized(): void;
  play(speed: number): void;
  seek(time: Time): void;
  setSpeed(speed: number): void;
  pause(): void;
  close(): void;
  setSubscriptions(subscriptions: SubscribePayload[]): void;
  recordBytesReceived(bytes: number): void;
  recordPlaybackTime(time: Time, stillLoadingData: boolean): void;
  recordDataProviderPerformance(metadata: AverageThroughput): void;
  recordUncachedRangeRequest(): void;
  recordTimeToFirstMsgs(): void;
  recordDataProviderInitializePerformance(metadata: InitializationPerformanceMetadata): void;
  recordDataProviderStall(metadata: DataProviderStall): void;
}
