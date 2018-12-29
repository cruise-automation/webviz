// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import Multiset from "./Multiset";

class Item {
  name: string;
  extraData: mixed;
  constructor(name: string, extraData: mixed) {
    this.name = name;
    this.extraData = extraData;
  }
}

function namesEqual(a: Item, b: Item) {
  return a.name === b.name;
}

describe("Multiset", () => {
  it("initializes empty", () => {
    const list: Multiset<Item> = new Multiset(namesEqual);
    expect(list.uniqueItems()).toHaveLength(0);
  });

  it("can add an item", () => {
    const list: Multiset<Item> = new Multiset(namesEqual);
    expect(list.add(new Item("foo", "x"))).toBe(true);
    expect(list.uniqueItems()).toContainOnly([new Item("foo", "x")]);
    expect(list.allItems()).toContainOnly([new Item("foo", "x")]);
    expect(list.add(new Item("foo", "x"))).toBe(false);
    expect(list.uniqueItems()).toContainOnly([new Item("foo", "x")]);
    expect(list.allItems()).toContainOnly([new Item("foo", "x"), new Item("foo", "x")]);
    expect(list.add(new Item("foo", "y"))).toBe(false);
    expect(list.uniqueItems()).toContainOnly([new Item("foo", "x")]);
    expect(list.allItems()).toContainOnly([new Item("foo", "x"), new Item("foo", "x"), new Item("foo", "y")]);
    expect(list.add(new Item("bar", "z"))).toBe(true);
    expect(list.uniqueItems()).toContainOnly([new Item("foo", "x"), new Item("bar", "z")]);
    expect(list.allItems()).toContainOnly([
      new Item("foo", "x"),
      new Item("foo", "x"),
      new Item("foo", "y"),
      new Item("bar", "z"),
    ]);
    expect(list.add(new Item("bar", "z"))).toBe(false);
    expect(list.uniqueItems()).toContainOnly([new Item("foo", "x"), new Item("bar", "z")]);
    expect(list.allItems()).toContainOnly([
      new Item("foo", "x"),
      new Item("foo", "x"),
      new Item("foo", "y"),
      new Item("bar", "z"),
      new Item("bar", "z"),
    ]);
  });

  it("can remove an item", () => {
    const list: Multiset<Item> = new Multiset(namesEqual);
    const foo = new Item("foo", "x");
    expect(list.remove(foo)).toBe(false);
    expect(list.add(foo)).toBe(true);
    expect(list.uniqueItems()).toContainOnly([foo]);
    expect(list.remove(foo)).toBe(true);
    expect(list.uniqueItems()).toHaveLength(0);
    expect(list.allItems()).toHaveLength(0);
    list.add(new Item("foo", "x"));
    expect(list.uniqueItems()).toHaveLength(1);
    expect(list.allItems()).toContainOnly([new Item("foo", "x")]);
    list.add(new Item("foo", "x"));
    expect(list.uniqueItems()).toHaveLength(1);
    expect(list.allItems()).toContainOnly([new Item("foo", "x"), new Item("foo", "x")]);
    list.add(new Item("foo", "x"));
    expect(list.uniqueItems()).toHaveLength(1);
    expect(list.allItems()).toContainOnly([new Item("foo", "x"), new Item("foo", "x"), new Item("foo", "x")]);
    expect(list.remove(new Item("foo", "x"))).toBe(false);
    expect(list.uniqueItems()).toHaveLength(1);
    expect(list.allItems()).toContainOnly([new Item("foo", "x"), new Item("foo", "x")]);
    expect(list.remove(new Item("foo", "x"))).toBe(false);
    expect(list.uniqueItems()).toHaveLength(1);
    expect(list.allItems()).toContainOnly([new Item("foo", "x")]);
    expect(list.remove(new Item("foo", "x"))).toBe(true);
    expect(list.uniqueItems()).toHaveLength(0);
    expect(list.allItems()).toHaveLength(0);
  });

  it("uses deep equality for removal", () => {
    const list: Multiset<Item> = new Multiset(namesEqual);
    expect(list.add(new Item("foo", [1, 2]))).toBe(true);
    expect(list.uniqueItems()).toContainOnly([new Item("foo", [1, 2])]);
    expect(list.allItems()).toContainOnly([new Item("foo", [1, 2])]);
    list.add(new Item("foo", "y"));
    expect(list.uniqueItems()).toHaveLength(1);
    expect(list.allItems()).toContainOnly([new Item("foo", [1, 2]), new Item("foo", "y")]);

    // remove an item that doesn't exist
    expect(list.remove(new Item("foo", [3, 4]))).toBe(false);
    expect(list.uniqueItems()).toHaveLength(1);
    expect(list.allItems()).toContainOnly([new Item("foo", [1, 2]), new Item("foo", "y")]);

    // remove an item that exists
    expect(list.remove(new Item("foo", [1, 2]))).toBe(false);
    expect(list.uniqueItems()).toHaveLength(1);
    expect(list.allItems()).toContainOnly([new Item("foo", "y")]);
    expect(list.remove(new Item("foo", [1, 2]))).toBe(false);
    expect(list.uniqueItems()).toHaveLength(1);
    expect(list.allItems()).toContainOnly([new Item("foo", "y")]);

    expect(list.remove(new Item("foo", "y"))).toBe(true);
    expect(list.uniqueItems()).toHaveLength(0);
    expect(list.allItems()).toHaveLength(0);
  });
});
