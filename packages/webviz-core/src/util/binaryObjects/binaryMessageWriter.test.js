// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import BobWriter from "./binaryMessageWriter";

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
