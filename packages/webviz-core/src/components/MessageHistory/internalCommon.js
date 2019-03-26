// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { getGlobalHooks } from "webviz-core/src/loadWebviz";

export const rosPrimitives = [
  "bool",
  "int8",
  "uint8",
  "int16",
  "uint16",
  "int32",
  "uint32",
  "int64",
  "uint64",
  "float32",
  "float64",
  "string",
  "time",
  "duration",
];

// It sometimes happens that topics have headers, but those headers don't have
// useful timestamps in them. This is done for internal reasons, as some APIs
// expect certain topics to always have headers. For now, we're just hardcoding
// these topics.
export const TOPICS_WITH_INCORRECT_HEADERS = getGlobalHooks().topicsWithIncorrectHeaders();

// A parsed version of paths.
export type MessagePathPart =
  | {| type: "name", name: string |}
  | {| type: "slice", start: number, end: number |}
  | {|
      type: "filter",
      name: string,
      value: number | string | {| variableName: string |},
      nameLoc: number,
      valueLoc: number,
    |};
export type RosPath = {|
  topicName: string,
  messagePath: MessagePathPart[],
  modifier: ?string,
|};
