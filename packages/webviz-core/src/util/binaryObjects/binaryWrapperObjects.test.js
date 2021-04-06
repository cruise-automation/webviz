// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { PointerExpression } from "./messageDefinitionUtils";
import { definitions } from "./testUtils";
import {
  printFieldDefinition,
  printGetClassForView,
  printSingularExpression,
} from "webviz-core/src/util/binaryObjects/binaryWrapperObjects";

describe("printSingularExpression", () => {
  it("handles strings", () => {
    const pointer = new PointerExpression("this.offset").add(1);
    expect(printSingularExpression({}, "string", pointer)).toBe(
      "$bigString.substr($view.getInt32((this.offset + 5), true), $view.getInt32((this.offset + 1), true))"
    );
  });

  it("handles JSON", () => {
    const pointer = new PointerExpression("this.offset").add(1);
    expect(printSingularExpression({}, "json", pointer)).toBe(
      "$context.parseJson($bigString.substr($view.getInt32((this.offset + 5), true), $view.getInt32((this.offset + 1), true)))"
    );
  });

  it("handles times", () => {
    const pointer = new PointerExpression("this.offset");
    expect(printSingularExpression(definitions, "time", pointer)).toBe("new time(this.offset)");
  });

  it("handles primitives", () => {
    const pointer = new PointerExpression("this.offset");
    expect(printSingularExpression(definitions, "int32", pointer)).toBe("$view.getInt32(this.offset, true)");
    expect(printSingularExpression(definitions, "uint64", pointer)).toBe("$int53.readUInt64LE($buffer, this.offset)");
    expect(printSingularExpression(definitions, "bool", pointer)).toBe("($view.getUint8(this.offset) !== 0)");
  });

  it("handles complex types", () => {
    const pointer = new PointerExpression("this.offset");
    expect(printSingularExpression(definitions, "std_msgs/Header", pointer)).toBe("new std_msgs_Header(this.offset)");
  });

  it("throws on unknown types", () => {
    const pointer = new PointerExpression("this.offset");
    expect(() => printSingularExpression(definitions, "not_a/Type", pointer)).toThrow("unknown type");
  });
});

describe("printFieldDefinition", () => {
  it("handles complex arrays", () => {
    const pointer = new PointerExpression("this.offset");
    const field = definitions["fake_msgs/HasComplexArray"].fields[0];
    expect(printFieldDefinition(definitions, field, pointer)).toBe(
      `
complexArray() {
  const from = $view.getInt32((this.offset + 4), true);
  const length = $view.getInt32(this.offset, true);
  return new fake_msgs_HasComplexAndArray$Array(from, length);
}`.trim()
    );
  });

  it("special-cases byte arrays", () => {
    const pointer = new PointerExpression("this.offset");
    const field = definitions["fake_msgs/HasByteArray"].fields[0];
    expect(printFieldDefinition(definitions, field, pointer)).toBe(
      `
byte_array() {
  const from = $view.getInt32((this.offset + 4), true);
  const length = $view.getInt32(this.offset, true);
  return new Uint8Array($arrayBuffer, from, length);
}`.trim()
    );
  });

  it("handles singular fields", () => {
    const pointer = new PointerExpression("this.offset");
    const field = definitions["std_msgs/Header"].fields[0];
    expect(printFieldDefinition(definitions, field, pointer)).toBe(
      `
seq() {
  return $view.getUint32(this.offset, true);
}`.trim()
    );
  });

  it("makes a method for constants", () => {
    const pointer = new PointerExpression("this.offset");
    const field = definitions["fake_msgs/HasConstant"].fields[0];
    expect(printFieldDefinition(definitions, field, pointer)).toBe(
      `
const() {
  return 1;
}`.trim()
    );
  });
});

describe("printGetClassForView", () => {
  it("returns the expected code", () => {
    expect(printGetClassForView(definitions, "fake_msgs/ContainsEverything", false)).toMatchSnapshot();
  });
});
