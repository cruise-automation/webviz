// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { evaluateCondition, getLastAccessor, stripLastAccessor } from "webviz-core/src/panels/Table/utils";

describe("utils", () => {
  describe("evaluateCondition", () => {
    it("Returns a boolean", () => {
      expect(evaluateCondition(0, "<", 1)).toEqual(true);
      expect(evaluateCondition(0, ">", 1)).toEqual(false);
    });
    it("Works with substring matching", () => {
      expect(evaluateCondition("cruise", "~", "cr")).toEqual(true);
      expect(evaluateCondition("webviz", "~", "cr")).toEqual(false);
    });
  });
  describe("getLastAccessor", () => {
    it("works for dot separated accessor paths", () => {
      expect(getLastAccessor("a")).toEqual("a");
      expect(getLastAccessor("col.a")).toEqual("a");
      expect(getLastAccessor("col.col.a")).toEqual("a");
    });
  });
  describe("stripLastAccessor", () => {
    expect(stripLastAccessor("a")).toEqual("");
    expect(stripLastAccessor("col.a")).toEqual("col");
    expect(stripLastAccessor("col.a.b")).toEqual("col.a");
  });
});
