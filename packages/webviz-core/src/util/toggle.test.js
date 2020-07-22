// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import toggle from "./toggle";

describe("Array toggle", () => {
  const items = [{ foo: "bar" }, { foo: "baz" }];

  it("uses shallow equality by default", () => {
    const arr = toggle(items, items[0]);
    expect(arr).toEqual([{ foo: "baz" }]);
    expect(items).toBe(items);
    expect(arr).not.toBe(items);
  });

  it("removes item if predicate returns true for it", () => {
    const arr = toggle(items, { foo: "bar" }, (item) => item.foo === "bar");
    expect(arr).toEqual([{ foo: "baz" }]);
    expect(items).toBe(items);
    expect(arr).not.toBe(items);
  });

  it("adds item if predicate returns false for everything", () => {
    const arr = toggle(items, { foo: "bar" }, () => false);
    expect(arr).toEqual([{ foo: "bar" }, { foo: "baz" }, { foo: "bar" }]);
    expect(items).toBe(items);
    expect(arr).not.toBe(items);
  });
});
