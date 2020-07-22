// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

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
  json: null,
};

export type RosPrimitive = $Keys<typeof RosPrimitives>;
export const rosPrimitives: RosPrimitive[] = Object.keys(RosPrimitives);

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

// "Structure items" are a more useful version of `datatypes`. They can be
// easily traversed to either validate message paths or generate message paths.
export type MessagePathStructureItemMessage = {|
  structureType: "message",
  nextByName: { [string]: MessagePathStructureItem }, // eslint-disable-line no-use-before-define
  datatype: string,
|};
type MessagePathStructureItemArray = {|
  structureType: "array",
  next: MessagePathStructureItem, // eslint-disable-line no-use-before-define
  datatype: string,
|};
type MessagePathStructureItemPrimitive = {|
  structureType: "primitive",
  primitiveType: RosPrimitive,
  datatype: string,
|};
export type MessagePathStructureItem =
  | MessagePathStructureItemMessage
  | MessagePathStructureItemArray
  | MessagePathStructureItemPrimitive;
