// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

export const TRANSFORM_TOPIC = "/tf";
export const DIAGNOSTIC_TOPIC = "/diagnostics";
// Create a node that publishes to /webviz/clock if you want a global clock topic.
// TODO(JP): Deprecate /webviz/clock entirely and use `receiveTime` everywhere instead.
export const CLOCK_TOPIC = "/webviz/clock";
export const SOCKET_KEY = "dataSource.websocket";
