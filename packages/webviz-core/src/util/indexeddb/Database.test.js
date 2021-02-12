// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import Database from "./Database";

async function put(db: Database, objectStore: string, values: any[]) {
  const tx = db.transaction(objectStore, "readwrite");
  for (const value of values) {
    await tx.objectStore(objectStore).put(value);
  }
  await tx.complete;
}
// NOTE: Each Database name needs to be unique if you do not want to pollute other tests.
describe("Database", () => {
  it("read/write", async () => {
    const db = await Database.open("foo", 1, (openedDb) => {
      openedDb.createObjectStore("bar", { autoIncrement: true });
    });
    const tx1 = db.transaction("bar", "readwrite");
    tx1.objectStore("bar").put("one");
    tx1.objectStore("bar").put("two");
    await tx1.complete;

    const tx2 = db.transaction("bar", "readonly");
    expect(await tx2.objectStore("bar").get(1)).toEqual("one");
    expect(await tx2.objectStore("bar").get(2)).toEqual("two");
    expect(await tx2.objectStore("bar").get(3)).toEqual(undefined);
    await tx2.complete;
    await db.close();
  });

  it("can do crud operations", async () => {
    const db = await Database.open("crud", 1, (openedDb) => {
      openedDb.createObjectStore("bar", { autoIncrement: true });
    });
    const result = await db.put("bar", { val: "something" }, "key-1");
    expect(result).toEqual("key-1");
    expect(await db.count("bar")).toEqual(1);
    expect(await db.get("bar", "key-1")).toEqual({ val: "something" });
    expect(await db.merge("bar", { foo: true }, "key-1")).toEqual({ val: "something", foo: true });
    expect(await db.merge("bar", { val: "something-else" }, "key-1")).toEqual({ val: "something-else", foo: true });
    expect(await db.count("bar")).toEqual(1);
    await db.delete("bar", "key-1");
    expect(await db.get("bar", "key-1")).toBeUndefined();
    expect(await db.count("bar")).toEqual(0);
  });

  it("can get single item", async () => {
    const def = {
      name: "foo",
      version: 1,
      objectStores: [
        {
          name: "bar",
          options: { autoIncrement: true },
        },
      ],
    };
    const db = await Database.get(def);
    const tx1 = db.transaction("bar", "readwrite");
    tx1.objectStore("bar").put("one");
    await tx1.complete;

    expect(await db.get("bar", 1)).toEqual("one");
    return db.close();
  });

  it("can read a range", async () => {
    const db = await Database.open("range", 1, (openedDb) => {
      openedDb.createObjectStore("bar", { autoIncrement: true });
    });
    await put(db, "bar", [{ one: 1 }, { two: 2 }, { three: 3 }]);
    const range = await db.getRange("bar", undefined, 1, 2);
    expect(range).toEqual([{ key: 1, value: { one: 1 } }, { key: 2, value: { two: 2 } }]);
    expect(await db.getRange("bar", undefined, 1, 100)).toEqual([
      { key: 1, value: { one: 1 } },
      { key: 2, value: { two: 2 } },
      { key: 3, value: { three: 3 } },
    ]);
    return db.close();
  });

  it("can read a range by index", async () => {
    const db = await Database.open("range-with-index", 1, (openedDb) => {
      const store = openedDb.createObjectStore("bar", { autoIncrement: true });
      store.createIndex("stamp", "stamp");
    });
    await put(db, "bar", [{ one: 1, stamp: 100 }, { two: 2, stamp: 50 }, { three: 3, stamp: 10 }]);
    const range = await db.getRange("bar", "stamp", 1, 20);
    expect(range).toEqual([{ key: 10, value: { three: 3, stamp: 10 } }]);
    const range2 = await db.getRange("bar", "stamp", 20, 50);
    expect(range2).toEqual([{ key: 50, value: { two: 2, stamp: 50 } }]);
    return db.close();
  });

  it("can create writable stream", async () => {
    const db = await Database.open("stream", 1, (openedDb) => {
      openedDb.createObjectStore("bar", { autoIncrement: true });
    });

    const writer = db.createWriteStream("bar");
    writer.write({ one: 1 });
    writer.write({ two: 2 });
    setImmediate(() => {
      writer.write({ three: 3 });
      writer.end();
    });

    writer.on("finish", async () => {
      const tx = db.transaction("bar");
      const store = tx.objectStore("bar");
      expect(await store.get(1)).toEqual({ one: 1 });
      expect(await store.get(2)).toEqual({ two: 2 });
      expect(await store.get(3)).toEqual({ three: 3 });
      expect(await store.get(4)).toEqual(undefined);
      expect(writer.total).toEqual(3);
    });
  });

  it("can create writable stream with extra appended", async () => {
    const db = await Database.open("stream-with-extra", 1, (openedDb) => {
      openedDb.createObjectStore("bar", { autoIncrement: true });
    });

    const writer = db.createWriteStream("bar", { extra: { topic: "/foo" } });
    writer.write({ one: 1 });
    writer.write({ two: 2 });
    setImmediate(() => {
      writer.write({ three: 3 });
      writer.end();
    });

    writer.on("finish", async () => {
      const tx = db.transaction("bar");
      const store = tx.objectStore("bar");
      expect(await store.get(1)).toEqual({ one: 1, topic: "/foo" });
      expect(await store.get(2)).toEqual({ two: 2, topic: "/foo" });
      expect(await store.get(3)).toEqual({ three: 3, topic: "/foo" });
      expect(await store.get(4)).toEqual(undefined);
      expect(writer.total).toEqual(3);
    });
  });

  it("can get all the keys in a store", async () => {
    const db = await Database.open("keys", 1, (openedDb) => {
      openedDb.createObjectStore("bar", { keyPath: "key" });
    });
    await put(db, "bar", [
      { key: "a", one: 1, stamp: 100 },
      { key: "b", two: 2, stamp: 50 },
      { key: "c", three: 3, stamp: 10 },
      { key: "d", four: 4, stamp: 10 },
    ]);
    expect(await db.keys("bar")).toContainOnly(["a", "b", "c", "d"]);
  });

  it("can get all keys and values in a store", async () => {
    const db = await Database.open("kvp", 1, (openedDb) => {
      openedDb.createObjectStore("bar", { keyPath: "key" });
    });
    const values = [
      { key: "a", one: 1, stamp: 100 },
      { key: "b", two: 2, stamp: 50 },
      { key: "c", three: 3, stamp: 10 },
      { key: "d", four: 4, stamp: 10 },
    ];
    await put(db, "bar", values);
    expect(await db.getAllKeyValues("bar")).toEqual(
      values.map(({ key, ...rest }) => ({ key, value: { key, ...rest } }))
    );
  });
});
