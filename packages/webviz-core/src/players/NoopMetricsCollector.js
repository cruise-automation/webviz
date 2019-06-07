// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { type Time } from "rosbag";

import { type PlayerMetricsCollectorInterface } from "webviz-core/src/types/players";

export default class NoopMetricsCollector implements PlayerMetricsCollectorInterface {
  initialized(): void {}
  play(speed: number): void {}
  seek(time: Time): void {}
  setSpeed(speed: number): void {}
  pause(): void {}
  close(): void {}
  recordPlaybackTime(time: Time): void {}
  recordBytesReceived(bytes: number): void {}
}
