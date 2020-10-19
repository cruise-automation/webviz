// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { getValueActionForValue, getStructureItemForPath } from "./getValueActionForValue";
import { wrapMessage } from "webviz-core/src/test/datatypes";

describe.each(["parsedMessages", "bobjects"])("getValueActionForValue %s", (format) => {
  const getAction = (data, structureItem, keyPath) => {
    const value =
      format === "bobjects"
        ? wrapMessage({ topic: "/dummy", receiveTime: { sec: 0, nsec: 0 }, message: { data } }).message.data()
        : data;
    return getValueActionForValue(value, structureItem, keyPath);
  };
  it("returns undefined if it is not a primitive", () => {
    const structureItem = {
      structureType: "message",
      nextByName: {},
      datatype: "",
    };
    expect(getAction({}, structureItem, [])).toEqual(undefined);
  });

  it("returns a pivot path when pointed at an id inside an array", () => {
    const structureItem = {
      structureType: "array",
      next: {
        structureType: "message",
        nextByName: {
          some_id: {
            structureType: "primitive",
            primitiveType: "uint32",
            datatype: "",
          },
        },
        datatype: "",
      },
      datatype: "",
    };
    expect(getAction([{ some_id: 123 }], structureItem, [0, "some_id"])).toEqual({
      type: "pivot",
      pivotPath: "[:]{some_id==123}",
    });
  });

  it("returns slice paths when pointing at a number (even when it looks like an id)", () => {
    const structureItem = {
      structureType: "message",
      nextByName: {
        some_id: {
          structureType: "primitive",
          primitiveType: "uint32",
          datatype: "",
        },
      },
      datatype: "",
    };
    expect(getAction({ some_id: 123 }, structureItem, ["some_id"])).toEqual({
      type: "primitive",
      singleSlicePath: ".some_id",
      multiSlicePath: ".some_id",
      primitiveType: "uint32",
    });
  });

  it("returns different single/multi slice paths when pointing at a value inside an array (not an id)", () => {
    const structureItem = {
      structureType: "array",
      next: {
        structureType: "message",
        nextByName: {
          some_value: {
            structureType: "primitive",
            primitiveType: "uint32",
            datatype: "",
          },
        },
        datatype: "",
      },
      datatype: "",
    };
    expect(getAction([{ some_value: 456 }], structureItem, [0, "some_value"])).toEqual({
      type: "primitive",
      singleSlicePath: "[0].some_value",
      multiSlicePath: "[:].some_value",
      primitiveType: "uint32",
    });
  });

  it("uses an id for the `singleSlicePath` if one is available next to the value", () => {
    const structureItem = {
      structureType: "array",
      next: {
        structureType: "message",
        nextByName: {
          some_id: {
            structureType: "primitive",
            primitiveType: "uint32",
            datatype: "",
          },
          some_value: {
            structureType: "primitive",
            primitiveType: "uint32",
            datatype: "",
          },
        },
        datatype: "",
      },
      datatype: "",
    };
    expect(getAction([{ some_id: 123, some_value: 456 }], structureItem, [0, "some_value"])).toEqual({
      type: "primitive",
      singleSlicePath: "[:]{some_id==123}.some_value",
      multiSlicePath: "[:].some_value",
      primitiveType: "uint32",
    });
  });

  it("returns value when looking inside a 'json' primitive", () => {
    const structureItem = { structureType: "primitive", primitiveType: "json", datatype: "" };
    expect(getAction({ abc: 0, def: 0 }, structureItem, ["abc"])).toEqual({
      multiSlicePath: ".abc",
      primitiveType: "json",
      singleSlicePath: ".abc",
      type: "primitive",
    });
  });

  it("returns single/multi slice paths when pointing at a value inside an array, nested inside a JSON field", () => {
    const structureItem = {
      structureType: "array",
      next: {
        structureType: "message",
        nextByName: { outer_key: { structureType: "primitive", primitiveType: "json", datatype: "" } },
        datatype: "",
      },
      datatype: "",
    };
    expect(getAction([{ outer_key: { nested_key: 456 } }], structureItem, [0, "outer_key", "nested_key"])).toEqual({
      type: "primitive",
      singleSlicePath: "[0].outer_key.nested_key",
      multiSlicePath: "[:].outer_key.nested_key",
      primitiveType: "json",
    });
  });

  it("returns undefined when trying to look inside a 'time'", () => {
    const structureItem = {
      structureType: "primitive",
      primitiveType: "time",
      datatype: "",
    };
    expect(getAction({ sec: 0, nsec: 0 }, structureItem, ["sec"])).toEqual(undefined);
  });

  it("returns slice paths for json", () => {
    const structureItem = {
      structureType: "message",
      nextByName: {
        some_id: {
          structureType: "primitive",
          primitiveType: "json",
          datatype: "",
        },
      },
      datatype: "",
    };
    expect(getAction({ some_id: 123 }, structureItem, ["some_id"])).toEqual({
      type: "primitive",
      singleSlicePath: ".some_id",
      multiSlicePath: ".some_id",
      primitiveType: "json",
    });
  });

  it(`wraps string path filters with ""`, () => {
    const rootValue = {
      status: [
        {
          level: 0,
          node_id: "/my_node",
        },
      ],
    };
    const rootStructureItem = {
      structureType: "message",
      nextByName: {
        status: {
          structureType: "array",
          next: {
            structureType: "message",
            nextByName: {
              level: {
                structureType: "primitive",
                primitiveType: "int8",
                datatype: "msgs/node",
              },
              node_id: {
                structureType: "primitive",
                primitiveType: "string",
                datatype: "msgs/node",
              },
            },
            datatype: "msgs/node",
          },
          datatype: "msgs/nodeArray",
        },
      },
      datatype: "msgs/nodeArray",
    };
    expect(getAction(rootValue, rootStructureItem, ["status", 0, "level"])).toEqual({
      type: "primitive",
      singleSlicePath: '.status[:]{node_id=="/my_node"}.level',
      multiSlicePath: ".status[:].level",
      primitiveType: "int8",
    });
  });
});

describe("getStructureItemForPath", () => {
  it("returns a structureItem for an array element", () => {
    const structureItem = {
      structureType: "array",
      next: {
        structureType: "primitive",
        primitiveType: "uint32",
        datatype: "",
      },
    };
    expect(getStructureItemForPath(structureItem, "0")).toEqual({
      structureType: "primitive",
      primitiveType: "uint32",
      datatype: "",
    });
  });

  it("returns a structureItem for a map element", () => {
    const structureItem = {
      structureType: "message",
      nextByName: {
        some_id: {
          structureType: "primitive",
          primitiveType: "uint32",
          datatype: "",
        },
      },
      datatype: "",
    };
    expect(getStructureItemForPath(structureItem, "some_id")).toEqual({
      structureType: "primitive",
      primitiveType: "uint32",
      datatype: "",
    });
  });

  it("returns a structureItem multi elements path", () => {
    const structureItem = {
      structureType: "array",
      next: {
        structureType: "message",
        nextByName: {
          some_id: {
            structureType: "primitive",
            primitiveType: "uint32",
            datatype: "",
          },
        },
        datatype: "",
      },
      datatype: "",
    };
    expect(getStructureItemForPath(structureItem, "0,some_id")).toEqual({
      structureType: "primitive",
      primitiveType: "uint32",
      datatype: "",
    });
  });
});
