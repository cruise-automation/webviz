// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { TimeUtil } from "rosbag";

import {
  evaluateCondition,
  getLastAccessor,
  stripLastAccessor,
  filterColumn,
  setSortConfig,
  sortTableData,
} from "webviz-core/src/panels/Table/utils";

describe("utils", () => {
  describe("setSortConfig", () => {
    let spy;
    beforeEach(() => {
      const mockDate = { getTime: () => 0 };
      spy = jest.spyOn(global, "Date").mockImplementation(() => mockDate);
    });
    afterEach(() => {
      spy.mockRestore();
    });
    it("sets the primary sort key on empty columns", () => {
      expect(setSortConfig({}, "a", true, false)).toEqual({ a: { sortDesc: true, sortDescTime: 0 } });
    });

    it("replaces the primary sort key", () => {
      expect(setSortConfig({ a: { sortDesc: true, sortDescTime: 0 } }, "b", true, false)).toEqual({
        a: {},
        b: { sortDesc: true, sortDescTime: 0 },
      });
    });
    it("reverses the primary sort key", () => {
      expect(setSortConfig({ a: { sortDesc: true, sortDescTime: 0 } }, "a", false, false)).toEqual({
        a: { sortDesc: false, sortDescTime: 0 },
      });
    });
    it("reverses the primary sort key and ignores the shift key", () => {
      expect(setSortConfig({ a: { sortDesc: true, sortDescTime: 0 } }, "a", false, true)).toEqual({
        a: { sortDesc: false, sortDescTime: 0 },
      });
    });

    it("clears the primary sort key without clearing other properties", () => {
      expect(setSortConfig({ a: { sortDesc: true, sortDescTime: 0, width: 1 } }, "a", undefined, false)).toEqual({
        a: { width: 1 },
      });
    });

    it("sets a secondary sort when `shiftPressed`", () => {
      expect(setSortConfig({ a: { sortDesc: true, sortDescTime: 0 } }, "b", true, true)).toEqual({
        a: { sortDesc: true, sortDescTime: 0 },
        b: { sortDesc: true, sortDescTime: 0 },
      });
    });
    it("sets a third sort when `shiftPressed` on a multi-sort config", () => {
      expect(
        setSortConfig(
          {
            a: { sortDesc: true, sortDescTime: 0 },
            b: { sortDesc: true, sortDescTime: 0 },
          },
          "c",
          true,
          true
        )
      ).toEqual({
        a: { sortDesc: true, sortDescTime: 0 },
        b: { sortDesc: true, sortDescTime: 0 },
        c: { sortDesc: true, sortDescTime: 0 },
      });
    });
    it("reverses the secondary sort key on a multi-sort config with shift pressed", () => {
      expect(
        setSortConfig(
          {
            a: { sortDesc: true, sortDescTime: 0 },
            b: { sortDesc: true, sortDescTime: 0 },
          },
          "b",
          false,
          true
        )
      ).toEqual({
        a: { sortDesc: true, sortDescTime: 0 },
        b: { sortDesc: false, sortDescTime: 0 },
      });
    });
  });
  describe("sortTableData", () => {
    const DEFAULT_TYPE_INFO = {
      isPrimitiveArrayColumn: undefined,
      isPrimitiveinComplexArrayColumn: undefined,
    };
    describe("primitive sorting", () => {
      it("sorts descending", () => {
        const sortedData = sortTableData(
          { a: true },
          { a: 0 },
          [{ id: "a", typeInfo: DEFAULT_TYPE_INFO }],
          [{ a: 0 }, { a: 1 }, { a: 2 }]
        );
        expect(sortedData).toEqual([{ a: 2 }, { a: 1 }, { a: 0 }]);
      });
      it("sorts ascending", () => {
        const sortedData = sortTableData(
          { a: false },
          { a: 0 },
          [{ id: "a", typeInfo: DEFAULT_TYPE_INFO }],
          [{ a: 1 }, { a: 0 }, { a: 2 }]
        );
        expect(sortedData).toEqual([{ a: 0 }, { a: 1 }, { a: 2 }]);
      });
    });

    describe("complex sorting", () => {
      it("works with 'isPrimitiveinComplexArrayColumn'", () => {
        const sortedData = sortTableData(
          { "a.b": true },
          { "a.b": 0 },
          [{ id: "a.b", typeInfo: { ...DEFAULT_TYPE_INFO, isPrimitiveinComplexArrayColumn: true } }],
          [{ a: [{ b: 1 }, { b: 0 }, { b: 2 }] }, { a: [{ b: 1 }, { b: 0 }, { b: 2 }] }]
        );
        expect(sortedData).toEqual([{ a: [{ b: 2 }, { b: 1 }, { b: 0 }] }, { a: [{ b: 2 }, { b: 1 }, { b: 0 }] }]);
      });
      it("works with 'isPrimitiveArrayColumn'", () => {
        const sortedData = sortTableData(
          { a: true },
          { a: 0 },
          [{ id: "a", typeInfo: { ...DEFAULT_TYPE_INFO, isPrimitiveArrayColumn: true } }],
          [{ a: [2, 0, 1] }, { a: [2, 0, 1] }]
        );
        expect(sortedData).toEqual([{ a: [2, 1, 0] }, { a: [2, 1, 0] }]);
      });
      it("uses 'sortType' when specified", () => {
        const sortedData = sortTableData(
          { t: true },
          { t: 0 },
          [{ id: "t", typeInfo: DEFAULT_TYPE_INFO, sortType: TimeUtil.compare }],
          [{ t: { sec: 1, nsec: 0 } }, { t: { sec: 0, nsec: 0 } }, { t: { sec: 2, nsec: 0 } }]
        );
        expect(sortedData).toEqual([
          { t: { sec: 2, nsec: 0 } },
          { t: { sec: 1, nsec: 0 } },
          { t: { sec: 0, nsec: 0 } },
        ]);
      });
    });
    describe("multi-sorting", () => {
      it("can multi-sort primitives", () => {
        const sortedData = sortTableData(
          { a: true, b: true },
          { a: 0, b: 1 },
          [{ id: "a", typeInfo: DEFAULT_TYPE_INFO }, { id: "b", typeInfo: DEFAULT_TYPE_INFO }],
          [{ a: 0, b: 0 }, { a: 0, b: 1 }, { a: 2, b: -1 }]
        );
        expect(sortedData).toEqual([{ a: 2, b: -1 }, { a: 0, b: 1 }, { a: 0, b: 0 }]);
      });
      it("can multi-sort primitives with differeing 'sortDesc'", () => {
        const sortedData = sortTableData(
          { a: true, b: false },
          { a: 0, b: 1 },
          [{ id: "a", typeInfo: DEFAULT_TYPE_INFO }, { id: "b", typeInfo: DEFAULT_TYPE_INFO }],
          [{ a: 0, b: 0 }, { a: 0, b: 1 }, { a: 2, b: -1 }]
        );
        expect(sortedData).toEqual([{ a: 2, b: -1 }, { a: 0, b: 0 }, { a: 0, b: 1 }]);
      });

      it("works with 'isPrimitiveinComplexArrayColumn'", () => {
        const sortedData = sortTableData(
          { "x.a": true, "x.b": true },
          { "x.a": 0, "x.b": 1 },
          [
            { id: "x.a", typeInfo: { ...DEFAULT_TYPE_INFO, isPrimitiveinComplexArrayColumn: true } },
            { id: "x.b", typeInfo: { ...DEFAULT_TYPE_INFO, isPrimitiveinComplexArrayColumn: true } },
          ],
          [
            { x: [{ a: 0, b: 0 }, { a: 0, b: 1 }, { a: 2, b: -1 }] },
            { x: [{ a: 0, b: 0 }, { a: 0, b: 1 }, { a: 2, b: -1 }] },
          ]
        );
        expect(sortedData).toEqual([
          { x: [{ a: 2, b: -1 }, { a: 0, b: 1 }, { a: 0, b: 0 }] },
          { x: [{ a: 2, b: -1 }, { a: 0, b: 1 }, { a: 0, b: 0 }] },
        ]);
      });
      it("only sorts the primary sort column on non-comparable items", () => {
        const sortedData = sortTableData(
          { "x.a": true, b: true },
          { "x.a": 0, b: 1 },
          [
            { id: "x.a", typeInfo: { ...DEFAULT_TYPE_INFO, isPrimitiveinComplexArrayColumn: true } },
            { id: "b", typeInfo: DEFAULT_TYPE_INFO },
          ],
          [{ b: 1, x: [{ a: 0 }, { a: 0 }, { a: 2 }] }, { b: 0, x: [{ a: 0 }, { a: 0 }, { a: 2 }] }, { b: 2, x: [] }]
        );
        expect(sortedData).toEqual([
          { b: 1, x: [{ a: 2 }, { a: 0 }, { a: 0 }] },
          { b: 0, x: [{ a: 2 }, { a: 0 }, { a: 0 }] },
          { b: 2, x: [] },
        ]);
      });
    });

    describe("handling bad configs", () => {
      it("handles non-existent column configs", () => {
        const data = [{ a: 0 }, { a: 1 }, { a: 2 }];
        const sortedData = sortTableData({ foo: true }, { foo: 0 }, [{ id: "bar", typeInfo: DEFAULT_TYPE_INFO }], data);
        expect(sortedData).toEqual(data);
      });
    });
  });
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
