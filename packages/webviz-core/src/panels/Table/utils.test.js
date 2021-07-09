// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import {
  evaluateCondition,
  getLastAccessor,
  stripLastAccessor,
  filterColumn,
} from "webviz-core/src/panels/Table/utils";

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
  describe("filterColumn", () => {
    const formatRows = (values: any[]) => values.map((val) => ({ values: { x: val } }));
    it("works on strings", () => {
      expect(
        filterColumn("string", "x", formatRows(["foo"]), ["x"], {
          value: "foo",
          comparator: "==",
        })
      ).toEqual(formatRows(["foo"]));
      expect(
        filterColumn("string", "x", formatRows(['{ "x": "foo" }', '{ "x": "bar" }']), ["x"], {
          value: "foo",
          comparator: "~",
        })
      ).toEqual(formatRows(['{ "x": "foo" }']));
    });
    it("works on booleans", () => {
      expect(
        filterColumn("bool", "x", formatRows([true, true, false]), ["x"], {
          value: "true",
          comparator: "==",
        })
      ).toEqual(formatRows([true, true]));
      expect(
        filterColumn("bool", "x", formatRows([true, true, false]), ["x"], {
          value: "false",
          comparator: "==",
        })
      ).toEqual(formatRows([false]));
    });
    it("works on numbers", () => {
      expect(
        filterColumn("uint8", "x", formatRows([1, 2, 3]), ["x"], {
          value: "1",
          comparator: "<=",
        })
      ).toEqual(formatRows([1]));
    });
    it("returns no values if the operator is not applicable", () => {
      expect(
        filterColumn("bool", "x", formatRows([true, true, false]), ["x"], {
          value: "true",
          comparator: "~",
        })
      ).toEqual(formatRows([]));
      expect(
        filterColumn("float64", "x", formatRows([1.0, 1.0, 1.0]), ["x"], {
          value: "1.0",
          comparator: "~",
        })
      ).toEqual(formatRows([]));
    });
  });
});
