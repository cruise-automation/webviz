// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { getGlobalHooks } from "webviz-core/src/loadWebviz";

const RosPrimitives = {
  bool: null,
  int8: null,
  uint8: null,
  int16: null,
  uint16: null,
  int32: null,
  uint32: null,
  int64: null,
  uint64: null,
  float32: null,
  float64: null,
  string: null,
  time: null,
  duration: null,
};

export type RosPrimitive = $Keys<typeof RosPrimitives>;
export const rosPrimitives: RosPrimitive[] = Object.keys(RosPrimitives);

// It sometimes happens that topics have headers, but those headers don't have
// useful timestamps in them. This is done for internal reasons, as some APIs
// expect certain topics to always have headers. For now, we're just hardcoding
// these topics.
export const TOPICS_WITH_INCORRECT_HEADERS = getGlobalHooks().topicsWithIncorrectHeaders();

export type MessagePathFilter = {|
  type: "filter",
  path: string[],
  value: void | number | string | {| variableName: string, startLoc: number |},
  nameLoc: number,
  valueLoc: number,
  repr: string, // the original string representation of the filter
|};

// A parsed version of paths.
export type MessagePathPart =
  | {| type: "name", name: string |}
  | {|
      type: "slice",
      start: number | {| variableName: string, startLoc: number |},
      end: number | {| variableName: string, startLoc: number |},
    |}
  | MessagePathFilter;

export type RosPath = {|
  topicName: string,
  messagePath: MessagePathPart[],
  modifier: ?string,
|};
