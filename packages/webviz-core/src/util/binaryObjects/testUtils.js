// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { RosValue } from "webviz-core/src/players/types";
import type { BinaryHeader } from "webviz-core/src/types/BinaryMessages";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";
import type { ArrayView } from "webviz-core/src/util/binaryObjects/ArrayViews";

export const definitions: RosDatatypes = {
  "std_msgs/Header": {
    fields: [{ type: "uint32", name: "seq" }, { type: "time", name: "stamp" }, { type: "string", name: "frame_id" }],
  },
  "fake_msgs/HasComplexAndArray": {
    fields: [{ type: "std_msgs/Header", name: "header" }, { type: "string", isArray: true, name: "stringArray" }],
  },
  "fake_msgs/HasComplexArray": {
    fields: [{ type: "fake_msgs/HasComplexAndArray", name: "complexArray", isArray: true }],
  },
  "fake_msgs/HasConstant": {
    fields: [{ type: "uint8", name: "const", isConstant: true, value: 1 }],
  },
  "fake_msgs/HasByteArray": {
    fields: [{ type: "uint8", name: "byte_array", isArray: true }],
  },
  "fake_msgs/HasJson": {
    fields: [{ type: "json", name: "jsonField" }],
  },
  "fake_msgs/HasInt64s": {
    fields: [{ type: "int64", name: "i64" }, { type: "uint64", name: "u64" }],
  },
  "fake_msgs/HasArrayOfEmpties": {
    fields: [{ type: "fake_msgs/HasConstant", name: "arr", isArray: true }],
  },
  "fake_msgs/HasBigIntArrays": {
    fields: [{ type: "int64", name: "i_arr", isArray: true }, { type: "uint64", name: "u_arr", isArray: true }],
  },
  "fake_msgs/ContainsEverything": {
    fields: [
      { type: "std_msgs/Header", name: "first" },
      { type: "fake_msgs/HasComplexAndArray", name: "second" },
      { type: "fake_msgs/HasComplexArray", name: "third" },
      { type: "fake_msgs/HasConstant", name: "fourth" },
      { type: "fake_msgs/HasByteArray", name: "fifth" },
      { type: "fake_msgs/HasJson", name: "sixth" },
      { type: "fake_msgs/HasInt64s", name: "seventh" },
      { type: "fake_msgs/HasArrayOfEmpties", name: "eighth" },
      { type: "fake_msgs/HasBigIntArrays", name: "ninth" },
    ],
  },
};

export type HasComplexAndArray = $ReadOnly<{|
  header(): BinaryHeader,
  stringArray(): ArrayView<string>,
|}>;

export type HasComplexArray = $ReadOnly<{|
  complexArray(): ArrayView<HasComplexAndArray>,
|}>;

export type HasConstant = $ReadOnly<{|
  const(): number,
|}>;

export type HasByteArray = $ReadOnly<{|
  byte_array(): Uint8Array,
|}>;

export type HasJson = $ReadOnly<{|
  jsonField(): RosValue,
|}>;

export type HasInt64s = $ReadOnly<{|
  i64(bigInt: ?true): number,
  u64(bigInt: ?true): number,
|}>;

export type HasArrayOfEmpties = $ReadOnly<{|
  arr(): ArrayView<HasConstant>,
|}>;

export type HasBigIntArrays = $ReadOnly<{|
  i_arr(): ArrayView<number>,
  u_arr(): ArrayView<number>,
|}>;

export type ContainsEverything = $ReadOnly<{|
  first(): BinaryHeader,
  second(): HasComplexAndArray,
  third(): HasComplexArray,
  fourth(): HasConstant,
  fifth(): HasByteArray,
  sixth(): HasJson,
  seventh(): HasInt64s,
  eighth(): HasArrayOfEmpties,
  ninth(): HasBigIntArrays,
|}>;
