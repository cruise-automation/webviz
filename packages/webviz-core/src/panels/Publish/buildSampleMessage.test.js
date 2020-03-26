// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import buildSampleMessage, { builtinSampleValues } from "./buildSampleMessage";

describe("buildSampleMessage", () => {
  const datatypes = {
    A: { fields: [] },
    B: { fields: [{ name: "data", type: "A" }] },
    C: {
      fields: [
        { name: "foo", type: "B", isConstant: true },
        { name: "bar", type: "B", isConstant: true, isArray: true },
      ],
    },
    D: { fields: [{ name: "foo", type: "B", isArray: true }] },
    E: { fields: [{ name: "foo", type: "B", isArray: true, arrayLength: 4 }] },
  };

  it("handles empty types", () => {
    expect(buildSampleMessage(datatypes, "A")).toEqual({});
  });
  it("handles single field", () => {
    expect(buildSampleMessage(datatypes, "B")).toEqual({ data: {} });
  });
  it("ignores constants", () => {
    expect(buildSampleMessage(datatypes, "C")).toEqual({});
  });
  it("handles variable-length arrays", () => {
    expect(buildSampleMessage(datatypes, "D")).toEqual({ foo: [{ data: {} }] });
  });
  it("handles fixed-length arrays", () => {
    expect(buildSampleMessage(datatypes, "E")).toEqual({
      foo: [{ data: {} }, { data: {} }, { data: {} }, { data: {} }],
    });
  });

  it("handles builtin types", () => {
    for (const type in builtinSampleValues) {
      expect(buildSampleMessage({}, type)).toEqual(builtinSampleValues[type]);
      expect(buildSampleMessage({ A: { fields: [{ name: "data", type }] } }, "A")).toEqual({
        data: builtinSampleValues[type],
      });
    }
  });
});
