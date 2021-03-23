// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { deepParse, getObject } from ".";
import {
  BobWriter,
  getSerializeFunctions,
  maybePrintStoreArray,
  printSerializationCode,
  printStoreMessageBody,
  printStoreSingularVariable,
} from "./binaryMessageWriter";
import { addTimeTypes, PointerExpression } from "./messageDefinitionUtils";
import { definitions } from "./testUtils";

describe("BobWriter", () => {
  it("can give an empty output", () => {
    const writer = new BobWriter();
    const { buffer, bigString } = writer.write();
    expect(bigString).toBe("");
    expect(buffer.byteLength).toBe(0);
  });

  it("can do simple writes", () => {
    const writer = new BobWriter();
    expect(writer.string("hello, ")).toBe(0);
    expect(writer.string("world")).toBe(7);
    let { offset, view } = writer.alloc(1);
    expect(offset).toBe(0);
    view.setUint8(offset, 1);
    ({ offset, view } = writer.alloc(1));
    expect(offset).toBe(1);
    view.setUint8(offset, 2);
    const { buffer, bigString } = writer.write();
    expect(bigString).toBe("hello, world");
    expect([...new Uint8Array(buffer)]).toEqual([1, 2]);
  });

  it("deduplicates strings", () => {
    const writer = new BobWriter();
    expect(writer.string("h")).toBe(0);
    expect(writer.string("ello")).toBe(1);
    expect(writer.string("ello")).toBe(1);
    const { buffer, bigString } = writer.write();
    expect(bigString).toBe("hello");
    expect(buffer.byteLength).toBe(0);
  });
});

describe("printStoreSingularVariable", () => {
  it("gives expected outputs", () => {
    const pointer = new PointerExpression("$offset").add(4);
    const variableName = "$field1";
    expect(printStoreSingularVariable(definitions, "json", variableName, pointer)).toBe(
      `const $field1$str = JSON.stringify($field1 === undefined ? null : $field1);
$view.setInt32(($offset + 4), $field1$str.length, true);
$view.setInt32(($offset + 8), $writer.string($field1$str), true);`
    );
    expect(printStoreSingularVariable(definitions, "string", variableName, pointer)).toBe(
      `const $field1$str = $field1 || "";
$view.setInt32(($offset + 4), $field1$str.length, true);
$view.setInt32(($offset + 8), $writer.string($field1$str), true);`
    );
    expect(printStoreSingularVariable(definitions, "bool", variableName, pointer)).toBe(
      "$view.setUint8(($offset + 4), +$field1);"
    );
    expect(printStoreSingularVariable(definitions, "int8", variableName, pointer)).toBe(
      "$view.setInt8(($offset + 4), $field1);"
    );
    expect(printStoreSingularVariable(definitions, "uint8", variableName, pointer)).toBe(
      "$view.setUint8(($offset + 4), $field1);"
    );
    expect(printStoreSingularVariable(definitions, "int16", variableName, pointer)).toBe(
      "$view.setInt16(($offset + 4), $field1, true);"
    );
    expect(printStoreSingularVariable(definitions, "uint16", variableName, pointer)).toBe(
      "$view.setUint16(($offset + 4), $field1, true);"
    );
    expect(printStoreSingularVariable(definitions, "int32", variableName, pointer)).toBe(
      "$view.setInt32(($offset + 4), $field1, true);"
    );
    expect(printStoreSingularVariable(definitions, "uint32", variableName, pointer)).toBe(
      "$view.setUint32(($offset + 4), $field1, true);"
    );
    expect(printStoreSingularVariable(definitions, "float32", variableName, pointer)).toBe(
      "$view.setFloat32(($offset + 4), $field1, true);"
    );
    expect(printStoreSingularVariable(definitions, "float64", variableName, pointer)).toBe(
      "$view.setFloat64(($offset + 4), $field1, true);"
    );
    expect(printStoreSingularVariable(definitions, "int64", variableName, pointer)).toBe(
      "$view.setBigInt64(($offset + 4), BigInt($field1 || 0), true);"
    );
    expect(printStoreSingularVariable(definitions, "uint64", variableName, pointer)).toBe(
      "$view.setBigUint64(($offset + 4), BigInt($field1 || 0), true);"
    );
    expect(() => printStoreSingularVariable(definitions, "time", variableName, pointer)).toThrow("unknown type");
  });
});

describe("maybePrintStoreArray", () => {
  it("prints expected code", () => {
    expect(maybePrintStoreArray(definitions, "string", "stringField", new PointerExpression("$offset").add(4))).toBe(
      `if (stringField == null) {
  $view.setFloat64(($offset + 4), 0, true);
} else {
  const stringField$l = stringField.length;
  let stringField$o = $alloc(stringField$l * 8);
  $view.setInt32(($offset + 4), stringField$l, true);
  $view.setInt32(($offset + 8), stringField$o, true);
  for (let stringField$i = 0; stringField$i < stringField$l; ++stringField$i) {
    const stringField$e = stringField[stringField$i];
    const stringField$e$str = stringField$e || "";
    $view.setInt32(stringField$o, stringField$e$str.length, true);
    $view.setInt32((stringField$o + 4), $writer.string(stringField$e$str), true);
    stringField$o += 8;
  }
}`
    );
  });
});

describe("printStoreMessageBody", () => {
  it("can print messages containing primitives", () => {
    expect(printStoreMessageBody(definitions, "fake_msgs/HasInt64s", "x", new PointerExpression("offset"))).toBe(
      `const v$i64 = x.i64;
$view.setBigInt64(offset, BigInt(v$i64 || 0), true);
const v$u64 = x.u64;
$view.setBigUint64((offset + 8), BigInt(v$u64 || 0), true);`
    );
  });

  it("can print messages containing complex children", () => {
    expect(
      printStoreMessageBody(definitions, "fake_msgs/HasComplexAndArray", "x", new PointerExpression("offset"))
    ).toBe(
      `const v$header = x.header;
if (v$header == null) {
  $storage.fill(0, offset, (offset + 20));
} else {
  $write$std_msgs_Header(v$header, offset);
}
const v$stringArray = x.stringArray;
if (v$stringArray == null) {
  $view.setFloat64((offset + 20), 0, true);
} else {
  const v$stringArray$l = v$stringArray.length;
  let v$stringArray$o = $alloc(v$stringArray$l * 8);
  $view.setInt32((offset + 20), v$stringArray$l, true);
  $view.setInt32((offset + 24), v$stringArray$o, true);
  for (let v$stringArray$i = 0; v$stringArray$i < v$stringArray$l; ++v$stringArray$i) {
    const v$stringArray$e = v$stringArray[v$stringArray$i];
    const v$stringArray$e$str = v$stringArray$e || "";
    $view.setInt32(v$stringArray$o, v$stringArray$e$str.length, true);
    $view.setInt32((v$stringArray$o + 4), $writer.string(v$stringArray$e$str), true);
    v$stringArray$o += 8;
  }
}`
    );
  });
});

describe("printSerializationCode", () => {
  it("returns the expected code", () => {
    expect(printSerializationCode(addTimeTypes(definitions))).toMatchSnapshot();
  });
});

const roundTrip = (writer, object, type) => {
  const functions = getSerializeFunctions(definitions, writer);
  functions[type](object);
  const { buffer, bigString } = writer.write();
  return deepParse(getObject(definitions, type, buffer, bigString));
};

describe("getSerializeFunction", () => {
  const writer = new BobWriter();
  beforeEach(() => {
    writer.write();
  });

  // TODO(steel): More tests -- round-tripping, absent fields etc.
  it("compiles", () => {
    const functions = getSerializeFunctions(definitions, writer);
    expect(Object.keys(functions)).toEqual([
      "std_msgs/Header",
      "fake_msgs/HasComplexAndArray",
      "fake_msgs/HasComplexArray",
      "fake_msgs/HasConstant",
      "fake_msgs/HasByteArray",
      "fake_msgs/HasJson",
      "fake_msgs/HasInt64s",
      "fake_msgs/HasArrayOfEmpties",
      "fake_msgs/HasBigIntArrays",
      "fake_msgs/ContainsEverything",
      "time",
      "duration",
    ]);
  });

  it("round-trips simple messages", () => {
    const parsedHeader = { seq: 1, stamp: { sec: 2, nsec: 3 }, frame_id: "f" };
    const roundTrippedHeader = roundTrip(writer, parsedHeader, "std_msgs/Header");
    expect(roundTrippedHeader).toEqual(parsedHeader);
  });

  it("handles missing singular fields", () => {
    const headerFromBlank = roundTrip(writer, {}, "std_msgs/Header");
    expect(headerFromBlank).toEqual({ seq: 0, frame_id: "", stamp: { sec: 0, nsec: 0 } });
  });

  it("handles missing arrays", () => {
    const hasArrayFromBlank = roundTrip(writer, {}, "fake_msgs/HasComplexArray");
    expect(hasArrayFromBlank).toEqual({ complexArray: [] });
  });

  it("handles missing JSON", () => {
    const hasJsonFromBlank = roundTrip(writer, {}, "fake_msgs/HasJson");
    expect(hasJsonFromBlank).toHaveProperty("jsonField");
    expect(hasJsonFromBlank.jsonField).toBeNull();
  });

  it("handles string arrays", () => {
    const stringArray = ["foo", "bar"];
    const hasArray = roundTrip(writer, { stringArray }, "fake_msgs/HasComplexAndArray");
    expect(hasArray.stringArray).toEqual(stringArray);
  });

  it("handles message arrays", () => {
    const element = { header: { stamp: { sec: 1, nsec: 2 }, seq: 3, frame_id: "a" }, stringArray: ["b", "c"] };
    const hasArray = { complexArray: [element, element] };
    expect(roundTrip(writer, hasArray, "fake_msgs/HasComplexArray")).toEqual(hasArray);
  });
});
