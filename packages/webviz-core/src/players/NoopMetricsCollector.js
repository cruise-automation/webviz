// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { type Time } from "rosbag";

import { type PlayerMetricsCollectorInterface, type SubscribePayload } from "webviz-core/src/players/types";

export default class NoopMetricsCollector implements PlayerMetricsCollectorInterface {
  playerConstructed(): void {}
  initialized(): void {}
  play(_speed: number): void {}
  seek(_time: Time): void {}
  setSpeed(_speed: number): void {}
  pause(): void {}
  close(): void {}
  setSubscriptions(_subscriptions: SubscribePayload[]): void {}
  recordPlaybackTime(_time: Time): void {}
  recordBytesReceived(_bytes: number): void {}
  recordDataProviderPerformance(): void {}
  recordUncachedRangeRequest(): void {}
  recordTimeToFirstMsgs(): void {}
  recordDataProviderInitializePerformance() {}
  recordDataProviderStall() {}
}
