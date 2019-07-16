// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { type Time } from "rosbag";

import type { Progress, Topic } from "webviz-core/src/types/players";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";
import type { ErrorType } from "webviz-core/src/util/reportError";

export type Connection = {
  messageDefinition: string,
  md5sum: string,
  topic: string,
  type: string,
};

export type MessageLike = {
  topic: string,
  receiveTime: Time,
  message: any,
};

// DataProviders can be instantiated using a DataProviderDescriptor and a GetDataProvider function.
// Because the descriptor is a plain JavaScript object, it can be sent over an Rpc Channel, which
// means that you can describe a chain of data providers that includes a Worker or a WebSocket.
export type DataProviderDescriptor = {|
  name: string,
  args: any,
  children: DataProviderDescriptor[],
|};

export type InitializationResult = {
  start: Time,
  end: Time,
  topics: Topic[],
  datatypes: RosDatatypes,

  // If returning raw messages to be parsed by `ParseMessagesDataProvider`, the DataProvider should
  // also return `connectionsByTopic`, so the right rosbag `Reader` can be instantiated.
  connectionsByTopic?: { [topic: string]: Connection },
};

export type DataProviderMetadata =
  | {| type: "error", source: string, errorType: ErrorType, message: string |}
  | {| type: "updateReconnecting", reconnecting: boolean |};
export type ExtensionPoint = {|
  progressCallback: (Progress) => void,
  reportMetadataCallback: (DataProviderMetadata) => void,
|};

// eslint-disable-next-line no-use-before-define
export type GetDataProvider = (DataProviderDescriptor) => RandomAccessDataProvider;

export interface RandomAccessDataProvider {
  constructor(args: any, children: DataProviderDescriptor[], getDataProvider: GetDataProvider): void;

  // Do any up-front initializing of the provider, and takes an optional extension point for
  // callbacks that only some implementations care about.
  initialize(extensionPoint: ExtensionPoint): Promise<InitializationResult>;

  // Get messages for a time range inclusive of start and end matching any of the provided topics.
  getMessages(start: Time, end: Time, topics: string[]): Promise<MessageLike[]>;

  // Close the provider.
  close(): Promise<void>;
}
