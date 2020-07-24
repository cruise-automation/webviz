// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { definitions } from "./messageDefinitionUtils.test";
import {
  getGetClassesForView,
  printFieldDefinition,
  printGetClassesForView,
  printSingularExpression,
  PointerExpression,
} from "./wrapperObjects";

describe("PointerExpression", () => {
  it("prints a constructed expression nicely", () => {
    expect(new PointerExpression("this.offset").toString()).toBe("this.offset");
  });

  it("adds correctly", () => {
    expect(new PointerExpression("this.offset").add(10).toString()).toBe("(this.offset + 10)");
    expect(
      new PointerExpression("this.offset")
        .add(10)
        .add(-10)
        .toString()
    ).toBe("this.offset");
  });
});

describe("printSingularExpression", () => {
  it("handles strings", () => {
    const pointer = new PointerExpression("this.offset").add(1);
    expect(printSingularExpression({}, "string", pointer)).toBe(
      "$bigString.slice($view.getInt32((this.offset + 1), true), $view.getInt32((this.offset + 5), true))"
    );
  });

  it("handles times", () => {
    const pointer = new PointerExpression("this.offset");
    expect(printSingularExpression(definitions, "time", pointer)).toBe("new time(this.offset)");
  });

  it("handles primitives", () => {
    const pointer = new PointerExpression("this.offset");
    expect(printSingularExpression(definitions, "int32", pointer)).toBe("$view.getInt32(this.offset, true)");
    expect(printSingularExpression(definitions, "uint64", pointer)).toBe("$view.getFloat64(this.offset, true)");
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
  const from = $view.getInt32(this.offset, true);
  const to = $view.getInt32((this.offset + 4), true);
  return new fake_msgs_HasComplexAndArray$Array(from, to);
}`.trim()
    );
  });

  it("special-cases byte arrays", () => {
    const pointer = new PointerExpression("this.offset");
    const field = definitions["fake_msgs/HasByteArray"].fields[0];
    expect(printFieldDefinition(definitions, field, pointer)).toBe(
      `
byte_array() {
  const from = $view.getInt32(this.offset, true);
  const to = $view.getInt32((this.offset + 4), true);
  return new Uint8Array($view.buffer, from, to - from);
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

  it("makes a static class function for constants", () => {
    const pointer = new PointerExpression("this.offset");
    const field = definitions["fake_msgs/HasConstant"].fields[0];
    expect(printFieldDefinition(definitions, field, pointer)).toBe(
      `
static const() {
  return 1;
}`.trim()
    );
  });
});

describe("printGetClassesForView", () => {
  it("returns the expected code", () => {
    expect(printGetClassesForView(definitions)).toMatchSnapshot();
  });
});

describe("getGetClassesForView", () => {
  it("returns an object", () => {
    const intArray = new Int32Array([12, 34]);
    const view = new DataView(intArray.buffer);
    const bigString = "";
    // Mostly just check that the code compiles for now.
    const classes = getGetClassesForView(definitions)(view, bigString);
    expect(classes).toEqual({
      "std_msgs/Header": expect.any(Function),
      "fake_msgs/HasComplexAndArray": expect.any(Function),
      "fake_msgs/HasComplexArray": expect.any(Function),
      "fake_msgs/HasConstant": expect.any(Function),
      "fake_msgs/HasByteArray": expect.any(Function),
      duration: expect.any(Function),
      time: expect.any(Function),
    });
    const t = new classes.time(0);
    expect(t.sec()).toBe(12);
    expect(t.nsec()).toBe(34);

    expect(classes["fake_msgs/HasConstant"].const()).toBe(1);
  });
  // TODO: Test arrays, strings etc.
});
