// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { addTimeTypes, friendlyTypeName, typeSize } from "./messageDefinitionUtils";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";

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
};

describe("friendlyTypeName", () => {
  it("handles removes slashes from primitives and message types", () => {
    expect(friendlyTypeName("time")).toBe("time");
    expect(friendlyTypeName("std_msgs/Header")).toBe("std_msgs_Header");
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
