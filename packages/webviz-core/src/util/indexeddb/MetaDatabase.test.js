// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import idb from "idb";

import Database from "./Database";
import { getDatabasesInTests } from "./getDatabasesInTests";
import { updateMetaDatabases, doesDatabaseExist } from "./MetaDatabase";

describe("MetaDatabase", () => {
  const MAX = 3;
  const METADATABASE_NAME = "meta";

  beforeEach(() => {
    getDatabasesInTests().clear();
  });

  afterEach(async () => {
    // Clear up metadata.
    await idb.delete(METADATABASE_NAME);
  });

  describe("updateMetadatabases", () => {
    it("deletes databases if over max", async () => {
      async function createAndClose(name: string) {
        const db = await Database.get({ name, version: 1, objectStores: [{ name: "foo" }] });
        await db.close();
        await updateMetaDatabases(name, 3, METADATABASE_NAME);
      }
      await createAndClose("foo");
      await createAndClose("bar");
      await createAndClose("baz");
      await createAndClose("biz");
      await createAndClose("boz");
      expect(getDatabasesInTests().size).toEqual(4);
    });

    it("does not delete databases which are still open", async () => {
      const dbs = [];
      async function createAndClose(name: string) {
        const db = await Database.get({ name, version: 1, objectStores: [{ name: "foo" }] });
        dbs.push(db);
        await updateMetaDatabases(name, 3, METADATABASE_NAME);
      }
      await createAndClose("foo2");
      await createAndClose("bar2");
      await createAndClose("baz2");
      await createAndClose("biz2");
      await createAndClose("boz2");
      expect(getDatabasesInTests().size).toEqual(6);
      await Promise.all(dbs.map((db) => db.close()));
      await createAndClose("boz3");
      expect(getDatabasesInTests().size).toEqual(4);
      await updateMetaDatabases("baz3", 1, METADATABASE_NAME);
      expect(getDatabasesInTests().size).toEqual(2);
      await Promise.all(dbs.map((db) => db.close()));
    });

    it("does not throw when database deletion throws an error", async () => {
      const spy = jest.spyOn(global.indexedDB, "deleteDatabase").mockImplementation(() => {
        const result = {
          // This gets overridden by caller. Only coded for throwing error to satisfy flow & lint.
          onerror: (err: Error) => {
            throw err;
          },
        };
        setTimeout(() => {
          result.onerror(new Error("failed to delete"));
        }, 10);
        return result;
      });
      await updateMetaDatabases("foo", 1, METADATABASE_NAME);
      await updateMetaDatabases("bar", 1, METADATABASE_NAME);
      spy.mockRestore();
    });

    it("does not delete databases which never fire onblocked calls", async () => {
      const spy = jest.spyOn(global.indexedDB, "deleteDatabase").mockImplementation(() => {
        return {};
      });
      await updateMetaDatabases("foo", 1, METADATABASE_NAME);
      await updateMetaDatabases("bar", 1, METADATABASE_NAME);
      spy.mockRestore();
    });
  });

  describe("doesDatabaseExist", () => {
    it("returns false for entries that do not yet exist", async () => {
      const isSaved = await doesDatabaseExist("a", METADATABASE_NAME);
      expect(isSaved).toBeFalsy();
    });
    it("returns true for names that already exist", async () => {
      await updateMetaDatabases("a", MAX, METADATABASE_NAME);
      const isSaved = await doesDatabaseExist("a", METADATABASE_NAME);
      expect(isSaved).toBeTruthy();
    });
  });
});
