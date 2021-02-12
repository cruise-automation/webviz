// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import Storage, { clearBustStorageFnsMap } from "./Storage";
import MemoryStorage from "webviz-core/src/test/MemoryStorage";

describe("Storage", () => {
  beforeEach(() => {
    clearBustStorageFnsMap();
  });

  it("returns void on a missing key", () => {
    const storage = new Storage(new MemoryStorage());
    expect(storage.getItem("foo.bar")).toBe(undefined);
  });

  it("round-trips strings", () => {
    const storage = new Storage(new MemoryStorage());
    expect(storage.setItem("foo", "bar")).toBe(undefined);
    expect(storage.getItem("foo")).toBe("bar");
  });

  it("round-trips objects", () => {
    const storage = new Storage(new MemoryStorage());
    storage.setItem("foo", { bar: "baz", qux: true });
    expect(storage.getItem("foo")).toEqual({ bar: "baz", qux: true });
  });

  it("returns undefined on unparsable json", () => {
    const backingStore = new MemoryStorage();
    backingStore.setItem("foo", "bar");
    const storage = new Storage(backingStore);
    expect(storage.getItem("foo")).toBe(undefined);
  });

  it("registers registerBustStorageFn and called it when the remaining storage is not enough", () => {
    const storage = new Storage(new MemoryStorage(15));
    const bustCacheFn = jest.fn();
    storage.registerBustStorageFn(bustCacheFn);
    storage.setItem("foo", "some value");
    expect(bustCacheFn).not.toHaveBeenCalled();

    expect(() => storage.setItem("foo", "some long value")).toThrow();
    expect(bustCacheFn).toHaveBeenCalled();
  });

  it("calls bustStorageFn in setItem before calling globally registered bustStorageFns", () => {
    const storage = new Storage(new MemoryStorage(15));
    const bustCacheFn = jest.fn();
    storage.registerBustStorageFn(bustCacheFn);
    storage.setItem("foo", "some value");
    expect(bustCacheFn).not.toHaveBeenCalled();

    storage.setItem("bar", "other value", (st) => {
      st.removeItem("foo");
    });
    expect(storage.getItem("bar")).toBe("other value");
    expect(storage.getItem("foo")).toBe(undefined);
    expect(bustCacheFn).not.toHaveBeenCalled();
  });

  it("calls bustStorageFn in setItem and call globally registered bustStorageFns to bust storage", () => {
    const storage = new Storage(new MemoryStorage(20));

    storage.registerBustStorageFn((st, keys) => {
      keys
        .filter((key) => key.startsWith("foo"))
        .forEach((key) => {
          st.removeItem(key);
        });
    });
    storage.setItem("foo", "some value");
    storage.setItem("bar", "some value");

    storage.setItem("foo1", "other value", (st) => {
      st.removeItem("bar");
    });

    expect(storage.getItem("bar")).toBe(undefined);
    expect(storage.getItem("foo")).toBe(undefined);
    expect(storage.getItem("foo1")).toBe("other value");
  });

  it("registers multiple bustStorageFn calls", () => {
    const storage = new Storage(new MemoryStorage(20));
    const bustCacheFn1 = jest.fn();
    const bustCacheFn2 = jest.fn().mockImplementationOnce(() => storage.removeItem("foo"));
    storage.registerBustStorageFn(bustCacheFn1);
    storage.registerBustStorageFn(bustCacheFn2);

    storage.setItem("foo", "some value");
    expect(bustCacheFn1).toHaveBeenCalledTimes(0);
    expect(bustCacheFn2).toHaveBeenCalledTimes(0);

    storage.setItem("bar", "some other value");
    expect(bustCacheFn1).toHaveBeenCalledTimes(1);
    expect(bustCacheFn2).toHaveBeenCalledTimes(1);
    expect(storage.getItem("foo")).toEqual(undefined);
    expect(storage.getItem("bar")).toEqual("some other value");
  });

  it("only clears cache from the corresponding backingStore", () => {
    const storage = new Storage(new MemoryStorage(15));
    const storage1 = new Storage(new MemoryStorage(15));
    const bustCacheFn = jest.fn().mockImplementationOnce((st) => st.removeItem("foo"));
    const bustCacheFn1 = jest.fn().mockImplementationOnce((st) => st.removeItem("bar"));
    storage.registerBustStorageFn(bustCacheFn);
    storage1.registerBustStorageFn(bustCacheFn1);

    storage.setItem("foo", "some value");
    storage1.setItem("bar", "some value-1");
    expect(storage.getItem("foo")).toEqual("some value");
    expect(storage1.getItem("bar")).toEqual("some value-1");

    storage.setItem("foo1", "some value-2");
    storage1.setItem("bar1", "some value-3");
    expect(storage.getItem("foo")).toEqual(undefined);
    expect(storage.getItem("foo1")).toEqual("some value-2");
    expect(storage1.getItem("bar")).toEqual(undefined);
    expect(storage1.getItem("bar1")).toEqual("some value-3");
  });
});
