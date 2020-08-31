// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { deepParse, getObject, getObjects, inaccurateByteSize, merge, wrapJsObject } from ".";
import { typeSize } from "./messageDefinitionUtils";
import {
  definitions,
  type HasArrayOfEmpties,
  type HasByteArray,
  type HasComplexAndArray,
  type HasComplexArray,
  type HasConstant,
  type HasJson,
  type HasInt64s,
} from "./messageDefinitionUtils.test";
import { cast } from "webviz-core/src/players/types";
import type { BinaryHeader } from "webviz-core/src/types/BinaryMessages";

describe("getObjects", () => {
  it("can compile everything", () => {
    const intArray = new Int32Array([]);
    const bigString = "";
    expect(getObjects(definitions, "fake_msgs/ContainsEverything", intArray.buffer, bigString, [])).toEqual([]);
  });

  it("can make classes with constants", () => {
    const intArray = new Int32Array([]);
    const bigString = "";
    const hasConstant = cast<HasConstant>(getObject(definitions, "fake_msgs/HasConstant", intArray.buffer, bigString));
    expect(inaccurateByteSize(hasConstant)).toBe(0);
    expect(hasConstant.const()).toBe(1);
    expect(deepParse(hasConstant)).toEqual({});
  });

  it("can make complex messages", () => {
    const intArray = new Int32Array([/*first*/ 1234, 56, 78, 2, 0, /*second*/ 5678, 43, 21, 4, 2]);
    const bigString = "asdf";
    const secondOffset = typeSize(definitions, "std_msgs/Header");
    const [first, second] = getObjects(definitions, "std_msgs/Header", intArray.buffer, bigString, [
      0,
      secondOffset,
    ]).map((o) => cast<BinaryHeader>(o));
    expect(inaccurateByteSize(first)).toBe(22);
    expect(inaccurateByteSize(second)).toBe(22);
    expect(() => inaccurateByteSize(first.stamp())).toThrow("Size of object not available");
    expect(first.stamp().sec()).toBe(56);
    expect(first.stamp().nsec()).toBe(78);
    expect(first.seq()).toBe(1234);
    expect(first.frame_id()).toBe("as");
    expect(deepParse(first)).toEqual({ stamp: { sec: 56, nsec: 78 }, seq: 1234, frame_id: "as" });

    expect(second.stamp().sec()).toBe(43);
    expect(second.stamp().nsec()).toBe(21);
    expect(second.seq()).toBe(5678);
    expect(second.frame_id()).toBe("df");
    expect(deepParse(second)).toEqual({ stamp: { sec: 43, nsec: 21 }, seq: 5678, frame_id: "df" });
  });

  it("can handle byte arrays", () => {
    const intArray = new Int32Array([4, 8, 0xdeadbeef]);
    const bigString = "";
    const hasByteArray = cast<HasByteArray>(
      getObject(definitions, "fake_msgs/HasByteArray", intArray.buffer, bigString)
    );
    // Bytes in reversed order -- little-endian.
    expect(hasByteArray.byte_array()).toEqual(new Uint8Array([0xef, 0xbe, 0xad, 0xde]));
    expect(deepParse(hasByteArray)).toEqual({ byte_array: new Uint8Array([0xef, 0xbe, 0xad, 0xde]) });
  });

  it("can handle primitive arrays", () => {
    const intArray = new Int32Array([
      ...[0, 0, 0, 0, 0], //header
      ...[2, 28], // string array
      ...[2, 0, 2, 2], // string array index data (into bigString)
    ]);
    const bigString = "asdf";
    const hasComplexAndArray = cast<HasComplexAndArray>(
      getObject(definitions, "fake_msgs/HasComplexAndArray", intArray.buffer, bigString)
    );
    expect([...hasComplexAndArray.stringArray()]).toEqual(["as", "df"]);
    expect(deepParse(hasComplexAndArray)).toEqual({
      header: {
        stamp: { sec: 0, nsec: 0 },
        seq: 0,
        frame_id: "",
      },
      stringArray: ["as", "df"],
    });
    expect(deepParse(hasComplexAndArray.stringArray())).toEqual(["as", "df"]);
  });

  it("can handle complex arrays", () => {
    const intArray = new Int32Array([
      ...[1, 8], // array of one element
      ...[0, 0, 0, 0, 0], // header
      ...[0, 0], // string array
    ]);
    const bigString = "";
    const hasComplexArray = cast<HasComplexArray>(
      getObject(definitions, "fake_msgs/HasComplexArray", intArray.buffer, bigString)
    );
    const complexArray = hasComplexArray.complexArray();
    expect(complexArray.length()).toBe(1);
    const complex = complexArray.get(0);
    expect(complex.stringArray().length()).toBe(0);
    expect(deepParse(hasComplexArray)).toEqual({
      complexArray: [
        {
          header: {
            stamp: { sec: 0, nsec: 0 },
            seq: 0,
            frame_id: "",
          },
          stringArray: [],
        },
      ],
    });
  });

  it("can handle JSON fields", () => {
    const bigString = `{ "asdf": [{ "qwer": 12 }] }`;
    const intArray = new Int32Array([bigString.length, 0]);
    const hasJson = cast<HasJson>(getObject(definitions, "fake_msgs/HasJson", intArray.buffer, bigString));
    expect(hasJson.jsonField()).toEqual({ asdf: [{ qwer: 12 }] });
    expect(deepParse(hasJson)).toEqual({ jsonField: { asdf: [{ qwer: 12 }] } });
  });

  it("can handle 64-bit integers", () => {
    const intArray = new Int32Array([0xffffffff, 0xffffffff, 0x1, 0x0]);
    const hasInt64s = cast<HasInt64s>(getObject(definitions, "fake_msgs/HasInt64s", intArray.buffer, ""));
    expect(deepParse(hasInt64s)).toEqual({ i64: -1, u64: 1 });
  });

  it("throws on access for out-of-range 64-bit integers", () => {
    // $FlowFixMe: console.assert is read-only.
    console.assert = (statement, message) => {
      if (!statement) {
        throw new Error(message);
      }
    };
    const intArray = new Int32Array([0xffffffff, 0xffffffff, 0xffffffff, 0xffffffff]);
    const hasInt64s = cast<HasInt64s>(getObject(definitions, "fake_msgs/HasInt64s", intArray.buffer, ""));
    expect(hasInt64s.i64()).toBe(-1);
    expect(() => hasInt64s.u64()).toThrow("number too large");
  });

  it("doesn't crash when given arrays of empty messages", () => {
    const intArray = new Int32Array([0, 0]);
    const hasArr1 = cast<HasArrayOfEmpties>(getObject(definitions, "fake_msgs/HasArrayOfEmpties", intArray.buffer, ""));
    expect(deepParse(hasArr1)).toEqual({ arr: [] });

    intArray[0] = 3;
    const hasArr2 = cast<HasArrayOfEmpties>(getObject(definitions, "fake_msgs/HasArrayOfEmpties", intArray.buffer, ""));
    expect(deepParse(hasArr2)).toEqual({ arr: [{}, {}, {}] });
  });
});

describe("wrapJsObject", () => {
  it("can make classes with constants", () => {
    const hasConstant = cast<HasConstant>(wrapJsObject(definitions, "fake_msgs/HasConstant", {}));
    expect(hasConstant.const()).toBe(1);
    expect(deepParse(hasConstant)).toEqual({});
  });

  it("can make complex messages", () => {
    const js = {
      stamp: { sec: 56, nsec: 78 },
      seq: 1234,
      frame_id: "as",
    };
    const wrapped = cast<BinaryHeader>(wrapJsObject(definitions, "std_msgs/Header", js));
    expect(wrapped.stamp().sec()).toBe(56);
    expect(wrapped.stamp().nsec()).toBe(78);
    expect(wrapped.seq()).toBe(1234);
    expect(wrapped.frame_id()).toBe("as");
    expect(deepParse(wrapped)).toEqual(js);
    expect(deepParse(wrapped.stamp())).toEqual(js.stamp);
  });

  it("can handle byte arrays", () => {
    const js = { byte_array: new Uint8Array([0xef, 0xbe, 0xad, 0xde]) };
    const wrapped = cast<HasByteArray>(wrapJsObject(definitions, "fake_msgs/HasByteArray", js));
    expect(wrapped.byte_array()).toEqual(new Uint8Array([0xef, 0xbe, 0xad, 0xde]));
    expect(deepParse(wrapped)).toEqual(js);
  });

  it("can handle primitive arrays", () => {
    const js = {
      header: {
        stamp: { sec: 0, nsec: 0 },
        seq: 0,
        frame_id: "",
      },
      stringArray: ["as", "df"],
    };
    const wrapped = cast<HasComplexAndArray>(wrapJsObject(definitions, "fake_msgs/HasComplexAndArray", js));
    expect([...wrapped.stringArray()]).toEqual(["as", "df"]);
    expect(wrapped.stringArray().get(0)).toBe("as");
    expect(wrapped.stringArray().length()).toBe(2);
    expect(deepParse(wrapped)).toEqual(js);
    expect(deepParse(wrapped.header())).toEqual(js.header);
  });

  it("can handle complex arrays", () => {
    const js = {
      complexArray: [
        {
          header: {
            stamp: { sec: 0, nsec: 0 },
            seq: 0,
            frame_id: "",
          },
          stringArray: [],
        },
      ],
    };
    const hasComplexArray = cast<HasComplexArray>(wrapJsObject(definitions, "fake_msgs/HasComplexArray", js));
    const complexArray = hasComplexArray.complexArray();
    expect(complexArray.length()).toBe(1);
    const complex = complexArray.get(0);
    expect(complex.stringArray().length()).toBe(0);
    expect(deepParse(hasComplexArray)).toEqual(js);
    expect([...complexArray]).toEqual([complex]);
    expect(deepParse(complexArray)).toEqual(js.complexArray);
  });

  it("can handle bobjects inside the wrapped object", () => {
    const intArray = new Int32Array([12, 34]);
    const stamp = getObject(definitions, "time", intArray.buffer, "");

    const js = { stamp, seq: 56, frame_id: "78" };
    const wrapped = cast<BinaryHeader>(wrapJsObject(definitions, "std_msgs/Header", js));

    expect(wrapped.stamp().sec()).toBe(12);
    expect(deepParse(wrapped.stamp())).toEqual({ sec: 12, nsec: 34 });
    expect(deepParse(wrapped)).toEqual({ stamp: { sec: 12, nsec: 34 }, seq: 56, frame_id: "78" });
  });

  it("can handle already-wrapped objects inside the wrapped object", () => {
    const stamp = wrapJsObject(definitions, "time", { sec: 12, nsec: 34 });
    const js = { stamp, seq: 56, frame_id: "78" };
    const wrapped = cast<BinaryHeader>(wrapJsObject(definitions, "std_msgs/Header", js));
    expect(wrapped.stamp().sec()).toBe(12);
    expect(deepParse(wrapped.stamp())).toEqual({ sec: 12, nsec: 34 });
    expect(deepParse(wrapped)).toEqual({ stamp: { sec: 12, nsec: 34 }, seq: 56, frame_id: "78" });
  });
});

describe("merge", () => {
  it("can override fields in wrapped JS messages", () => {
    const bobject = wrapJsObject(definitions, "std_msgs/Header", {
      frame_id: "asdf",
      seq: 1,
      stamp: { sec: 123, nsec: 456 },
    });
    const merged = cast<BinaryHeader>(merge(bobject, { frame_id: "qwer" }));

    expect(merged.seq()).toBe(1);
    expect(merged.frame_id()).toBe("qwer");
    expect(deepParse(merged)).toEqual({
      frame_id: "qwer",
      seq: 1,
      stamp: { sec: 123, nsec: 456 },
    });
  });

  it("can override fields in wrapped binary messages", () => {
    const { buffer } = new Int32Array([1234, 4567, 6789, 0, 0]);
    const bobject = getObject(definitions, "std_msgs/Header", buffer, "");
    const merged = cast<BinaryHeader>(merge(bobject, { frame_id: "qwer" }));

    expect(merged.seq()).toBe(1234);
    expect(merged.stamp().sec()).toBe(4567);
    expect(merged.frame_id()).toBe("qwer");
    expect(deepParse(merged)).toEqual({
      frame_id: "qwer",
      seq: 1234,
      stamp: { sec: 4567, nsec: 6789 },
    });
  });

  it("can override overridden things", () => {
    const bobject = wrapJsObject(definitions, "std_msgs/Header", {
      frame_id: "asdf",
      seq: 1,
      stamp: { sec: 123, nsec: 456 },
    });
    const merged1 = cast<BinaryHeader>(merge(bobject, { frame_id: "qwer" }));
    const merged2 = cast<BinaryHeader>(merge(merged1, { frame_id: "zxcv" }));

    expect(merged1.frame_id()).toBe("qwer");
    expect(merged2.frame_id()).toBe("zxcv");
    expect(merged2.seq()).toBe(1);
  });
});
