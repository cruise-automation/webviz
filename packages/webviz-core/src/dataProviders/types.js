// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { type Time } from "rosbag";

import type { Progress, Topic, Message, MessageDefinitionsByTopic } from "webviz-core/src/players/types";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";

// `DataProvider` describes a more specific kind of data ingesting than `Player`, namely ingesting
// data that we have random access to. From Wikipedia:
//
//   "Random access is the ability to access an arbitrary element of a sequence in equal time or any
//    datum from a population of addressable elements roughly as easily and efficiently as any other,
//    no matter how many elements may be in the set."
//
// The data is stored somewhere (e.g. in a local file, or on some server), in some sort of
// representation (e.g. a ROS bag, or a JSON file, or something else). Conceptually, we treat the
// data as static and immutable, which means that when you fetch the same time range twice, you
// should get the exact same messages, and when you fetch one time range, you should get the exact
// same messages as when splitting it into two fetch calls with shorter time ranges.
//
// A DataProvider initially returns basic information, such as the time range for which we have data,
// and the topics and data types. It then allows for requesting messages for arbitrary time ranges
// within, though it is the caller's responsibility to request small enough time ranges, since in
// general DataProviders give no guarantees of how fast they return the data.
//
// The properties of immutability and idempotence make it very easy to compose different
// DataProviders. For example, you can have a BagDataProvider which reads from a ROS bag, but which
// takes a bit of time to decompress the ROS bag. So you might wrap it in a WorkerDataProvider,
// which puts its children in a Web Worker, therefore allowing the decompression to happen in
// parallel to the main thread. And you might wrap that in turn in a MemoryCacheDataProvider, which
// does some in-memory read-ahead caching based on the most recent time range that was requested.
// These trees of DataProviders are described by `DataProviderDescriptor`.
//
// DataProviders have a strict API which is enforced automatically in ApiCheckerDataProvider. It's
// also easy to measure the performance of each DataProvider in a tree by putting using the
// `_measureDataProviders` URL param, which causes every DataProvider to be wrapped in a
// MeasureDataProvider.

export type GetMessagesExtra = {| topicsToOnlyLoadInBlocks: Set<string> |};

// We disable no-use-before-define so we can have the most important types at the top.
/* eslint-disable no-use-before-define */
export interface DataProvider {
  constructor(
    // The arguments to this particular DataProvider; typically an object.
    args: any,
    // The children we should instantiate below. Many DataProviders cannot have any children (leaf
    // nodes in the tree), many require exactly one child, and the `CombinedDataProvider` can take
    // an arbitrary number of children.
    children: DataProviderDescriptor[],
    // The function to instantiate the children (different in e.g. Web Workers).
    getDataProvider: GetDataProvider
  ): void;

  // Do any up-front initializing of the provider, and takes an optional extension point for
  // callbacks that only some implementations care about. May only be called once. If there's an
  // error during initialization, it must be reported using `sendNotification` (even in Web Workers).
  // If the error is unrecoverable, just never resolve the promise.
  // TODO(JP): It would be better to reject the promise explicitly in case of unrecoverable errors,
  // so we can update the UI appropriately.
  initialize(extensionPoint: ExtensionPoint): Promise<InitializationResult>;

  // Get messages for a time range inclusive of start and end matching any of the provided topics.
  // May only be called after `initialize` has finished. Returned messages must be ordered by
  // `receiveTime`. May not return any messages outside the time range, or outside the requested
  // list of topics. Must always return the same messages for a given time range, including when
  // querying overlapping time ranges multiple times.
  // If `topicsToOnlyLoadInBlocks` is set, then messages from those topics are not expected to be
  // returned by this function, but only separately through the `Progress#blocks`.
  getMessages(start: Time, end: Time, topics: string[], extra?: ?GetMessagesExtra): Promise<Message[]>;

  // Close the provider (e.g. close any connections to a server). Must be called only after
  // `initialize` has finished.
  close(): Promise<void>;
}

export type InitializationResult = {|
  start: Time, // Inclusive (time of first message).
  end: Time, // Inclusive (time of last message).
  topics: Topic[],
  datatypes: RosDatatypes, // Must be "complete", just as in the definition of `Player`.

  // Signals whether the messages returned from calls to getMessages are parsed into Javascript
  // objects or are returned in ROS binary format.
  providesParsedMessages: boolean,
  // The ROS message definitions for each provided topic. Entries are required for topics that are
  // available through the data provider in binary format, either directly through getMessages calls
  // or indirectly through the player progress mechanism.
  messageDefinitionsByTopic: MessageDefinitionsByTopic,
|};

export type ExtensionPoint = {|
  // Report some sort of progress, e.g. of caching or downloading.
  progressCallback: (Progress) => void,

  // Report some sort of metadata to the `Player`, see below for different kinds of metadata.
  // TODO(JP): this is a bit of an odd one out. Maybe we should unify this with the
  // `progressCallback` and have one type of "status" object?
  reportMetadataCallback: (DataProviderMetadata) => void,
|};

export type PerformanceMetadata = $ReadOnly<{|
  type: "performance",
  inputType: string,
  inputSource: string,
  totalSizeOfMessages: number, // bytes
  numberOfMessages: number,
  requestedRangeDuration: Time,
  receivedRangeDuration: Time, // Connections could be canceled on seeks.
  topics: $ReadOnlyArray<string>,
  totalTransferTime: Time,
|}>;

export type DataProviderMetadata =
  // Report whether or not the DataProvider is reconnecting to some external server. Used to show a
  // loading indicator in the UI.
  $ReadOnly<{| type: "updateReconnecting", reconnecting: boolean |}> | PerformanceMetadata;

// A ROS bag "connection", used for parsing messages.
export type Connection = {|
  messageDefinition: string,
  md5sum: string,
  topic: string,
  type: string,
|};

// DataProviders can be instantiated using a DataProviderDescriptor and a GetDataProvider function.
// Because the descriptor is a plain JavaScript object, it can be sent over an Rpc Channel, which
// means that you can describe a chain of data providers that includes a Worker or a WebSocket.
export type DataProviderDescriptor = {|
  name: string,
  args: any,
  children: DataProviderDescriptor[],
|};

export type GetDataProvider = (DataProviderDescriptor) => DataProvider;
