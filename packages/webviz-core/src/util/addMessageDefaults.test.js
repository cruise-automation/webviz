// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { fromPairs } from "lodash";
import { rosPrimitiveTypes } from "rosbag";

import addMessageDefaults from "./addMessageDefaults";

describe("addMessageDefaults", () => {
  it("sets primitve types", () => {
    const rosPrimitiveTypesArray = Array.from(rosPrimitiveTypes);
    const datatypes = fromPairs(
      rosPrimitiveTypesArray.map((typeName) => [typeName, { fields: [{ type: typeName, name: typeName }] }])
    );

    for (const typeName of Object.keys(datatypes)) {
      const message = {};
      addMessageDefaults(datatypes, typeName, message);
      const fieldSetToDefault = message[typeName];

      if (typeName === "string") {
        expect(fieldSetToDefault).toEqual("");
      } else if (typeName === "json") {
        expect(fieldSetToDefault).toEqual({});
      } else if (typeName === "time" || typeName === "duration") {
        expect(fieldSetToDefault).toEqual({ sec: 0, nsec: 0 });
      } else if (typeName === "bool") {
        expect(fieldSetToDefault).toEqual(false);
      } else if (typeName === "float64" || typeName === "float32") {
        expect(fieldSetToDefault).toEqual(NaN);
      } else {
        expect(fieldSetToDefault).toEqual(0);
      }
    }
  });

  it("does not set constant types", () => {
    const datatypes = {
      root: {
        fields: [
          { type: "child", name: "child", isComplex: true, isConstant: true },
          { type: "child", name: "child_array", isComplex: true, isArray: true, isConstant: true },
          { type: "string", name: "string_array", isArray: true, isConstant: true },
          { type: "string", name: "string", isConstant: true },
        ],
      },
      child: { fields: [{ type: "string", name: "string" }] },
    };
    const message = {};
    addMessageDefaults(datatypes, "root", message);
    expect(message).toEqual({});
  });

  it("recursively sets fields in complex types", () => {
    const datatypes = {
      root: { fields: [{ type: "child", name: "child", isComplex: true }] },
      child: { fields: [{ type: "string", name: "string" }] },
    };
    const message = { child: {} };
    addMessageDefaults(datatypes, "root", message);
    expect(message.child.string).toEqual("");
  });

  it("recursively sets fields in complex array types", () => {
    const datatypes = {
      root: { fields: [{ type: "child", name: "child", isComplex: true, isArray: true }] },
      child: { fields: [{ type: "string", name: "string" }] },
    };
    const message = { child: [{}] };
    addMessageDefaults(datatypes, "root", message);
    expect(message.child[0].string).toEqual("");
  });

  it("sets missing empty arrays", () => {
    const datatypes = {
      root: { fields: [{ type: "string", name: "child", isArray: true }] },
    };
    const message = {};
    addMessageDefaults(datatypes, "root", message);
    expect(message.child).toEqual([]);
  });

  it("sets null fields in array types", () => {
    const datatypes = {
      root: { fields: [{ type: "string", name: "child", isArray: true }] },
    };
    const message = { child: [null] };
    addMessageDefaults(datatypes, "root", message);
    expect(message.child).toEqual([""]);
  });

  it("sets a complex object when it is not present", () => {
    const datatypes = {
      root: { fields: [{ type: "child", name: "child", isComplex: true }] },
      child: { fields: [{ type: "string", name: "string" }] },
    };
    const message = {};
    addMessageDefaults(datatypes, "root", message);
    expect(message.child.string).toEqual("");
  });
});
