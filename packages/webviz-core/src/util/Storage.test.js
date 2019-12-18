// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import Storage from "./Storage";
import MemoryStorage from "webviz-core/src/test/MemoryStorage";

describe("Storage", () => {
  it("returns void on a missing key", () => {
    const storage = new Storage(new MemoryStorage());
    expect(storage.get("foo.bar")).toBe(undefined);
  });

  it("round-trips strings", () => {
    const storage = new Storage(new MemoryStorage());
    expect(storage.set("foo", "bar")).toBe(undefined);
    expect(storage.get("foo")).toBe("bar");
  });

  it("round-trips objects", () => {
    const storage = new Storage(new MemoryStorage());
    storage.set("foo", { bar: "baz", qux: true });
    expect(storage.get("foo")).toEqual({ bar: "baz", qux: true });
  });

  it("returns undefined on unparsable json", () => {
    const backingStore = new MemoryStorage();
    backingStore.setItem("foo", "bar");
    const storage = new Storage(backingStore);
    expect(storage.get("foo")).toBe(undefined);
  });
});
