// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { addTimeTypes, friendlyTypeName, typeSize } from "./messageDefinitionUtils";
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
  i64(): number,
  u64(): number,
|}>;

export type HasArrayOfEmpties = $ReadOnly<{|
  arr(): ArrayView<HasConstant>,
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
|}>;

describe("friendlyTypeName", () => {
  it("removes slashes from primitives and message types", () => {
    expect(friendlyTypeName("time")).toBe("time");
    expect(friendlyTypeName("std_msgs/Header")).toBe("std_msgs_Header");
  });

  it("removes more than one slash when several are present", () => {
    expect(friendlyTypeName("webviz_msgs/traffic_light_lane_state/directive_state")).toBe(
      "webviz_msgs_traffic_light_lane_state_directive_state"
    );
  });
});

describe("addTimeTypes", () => {
  it("adds time definitions to the definitions of 'real' complex types", () => {
    expect(addTimeTypes(definitions)).toEqual({
      ...definitions,
      time: { fields: [{ name: "sec", type: "int32" }, { name: "nsec", type: "int32" }] },
      duration: { fields: [{ name: "sec", type: "int32" }, { name: "nsec", type: "int32" }] },
    });
  });
});

describe("typeSize", () => {
  it("works for primitives", () => {
    expect(typeSize(definitions, "time")).toBe(8);
    expect(typeSize(definitions, "string")).toBe(8);
    expect(typeSize(definitions, "int8")).toBe(1);
    expect(typeSize(definitions, "float32")).toBe(4);
  });

  it("works for simple compound datatypes", () => {
    expect(typeSize(definitions, "std_msgs/Header")).toBe(/*4 + 8 + 8*/ 20);
  });

  it("works for more complex datatypes", () => {
    expect(typeSize(definitions, "fake_msgs/HasComplexAndArray")).toBe(8 + 20);
  });

  it("works for constants", () => {
    expect(typeSize(definitions, "fake_msgs/HasConstant")).toBe(0);
  });

  it("throws for datatypes that don't exist", () => {
    expect(() => typeSize(definitions, "asdf")).toThrow();
  });

  it("works for arrays of complex datatypes", () => {
    expect(typeSize(definitions, "fake_msgs/HasComplexArray")).toBe(8);
  });
});
