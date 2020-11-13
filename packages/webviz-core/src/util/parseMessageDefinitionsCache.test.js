// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { CacheForTesting as ParseMessageDefinitionsCache } from "./parseMessageDefinitionsCache";

describe("parseMessageDefinitionsCache", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("on construction", () => {
    it("loads previously parsed definitions stored in localStorage", () => {
      const cache1 = new ParseMessageDefinitionsCache();
      cache1.parseMessageDefinition("string value", "dummy md5");
      const cache2 = new ParseMessageDefinitionsCache();
      expect(cache2.getStoredDefinition("dummy md5")).toEqual([
        {
          definitions: [
            {
              isArray: false,
              isComplex: false,
              name: "value",
              type: "string",
            },
          ],
        },
      ]);
    });
  });

  describe("parseMessageDefinition", () => {
    it("parses the definition", () => {
      const cache = new ParseMessageDefinitionsCache();
      expect(cache.parseMessageDefinition("string value")).toEqual([
        {
          definitions: [
            {
              isArray: false,
              isComplex: false,
              name: "value",
              type: "string",
            },
          ],
        },
      ]);
    });

    it("does not re-parse definitions that have already been parsed", () => {
      const cache = new ParseMessageDefinitionsCache();
      const firstDefiniton = cache.parseMessageDefinition("string value");
      const secondDefinition = cache.parseMessageDefinition("string value");
      expect(firstDefiniton).toBe(secondDefinition);
    });

    it("does not re-parse definitions that have already been parsed, with md5", () => {
      const cache = new ParseMessageDefinitionsCache();
      const firstDefiniton = cache.parseMessageDefinition("string value", "dummy md5");
      const secondDefinition = cache.parseMessageDefinition("string value", "dummy md5");
      expect(firstDefiniton).toBe(secondDefinition);
    });

    it("stores the definition in localStorage", () => {
      const cache = new ParseMessageDefinitionsCache();
      const definition = cache.parseMessageDefinition("string value", "dummy md5");
      const localStorageItem = localStorage.getItem("msgdefn/dummy md5");
      expect(JSON.parse(localStorageItem || "")).toEqual(definition);
    });

    it("on localStorage failure, clears and reloads all localStorage definitions", () => {
      const previousCache = new ParseMessageDefinitionsCache();
      previousCache.parseMessageDefinition("string value1", "md5 to remove");
      expect(localStorage.getItem("msgdefn/md5 to remove")).not.toEqual(undefined);
      localStorage.setItem("test", "test");

      const cache = new ParseMessageDefinitionsCache();
      const definition1 = cache.parseMessageDefinition("string value2", "dummy md5 1");

      jest.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
        throw new Error("quota exceeded");
      });
      const definition2 = cache.parseMessageDefinition("string value", "dummy md5");

      // Both keys should be in localStorage.
      const localStorageItem1 = localStorage.getItem("msgdefn/dummy md5 1");
      expect(JSON.parse(localStorageItem1 || "")).toEqual(definition1);
      const localStorageItem2 = localStorage.getItem("msgdefn/dummy md5");
      expect(JSON.parse(localStorageItem2 || "")).toEqual(definition2);
      // The key from the previous cache should be removed.
      expect(localStorage.getItem("msgdefn/md5 to remove")).toEqual(null);
      // Any non-message definition localStorage keys should be restored.
      expect(localStorage.getItem("test")).toEqual("test");
      Storage.prototype.setItem.mockRestore();
    });

    it("on localStorage failure when reloading definitions, no longer uses localStorage", () => {
      const cache = new ParseMessageDefinitionsCache();
      cache.parseMessageDefinition("string value2", "dummy md5 1");

      let setItemCount = 0;
      jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        setItemCount++;
        throw new Error("quota exceeded");
      });
      cache.parseMessageDefinition("string value", "dummy md5");
      cache.parseMessageDefinition("string value3", "dummy md5 2");
      cache.parseMessageDefinition("string value4", "dummy md5 3");
      // Fails the first time, and then fails again when trying to set all keys, so we stop using localStorage.
      expect(setItemCount).toEqual(2);
      Storage.prototype.setItem.mockRestore();
    });
  });

  describe("getStoredDefinition", () => {
    it("gets previously parsed definitions", () => {
      const cache = new ParseMessageDefinitionsCache();
      const definition = cache.parseMessageDefinition("string value", "dummy md5");
      expect(cache.getStoredDefinition("dummy md5")).toBe(definition);
    });

    it("returns undefined if the definition cannot be found", () => {
      const cache = new ParseMessageDefinitionsCache();
      expect(cache.getStoredDefinition("dummy md5")).toEqual(undefined);
    });
  });

  describe("getMd5sForStoredDefintions", () => {
    it("gets all md5s for the stored definitions", () => {
      const cache = new ParseMessageDefinitionsCache();
      cache.parseMessageDefinition("string value", "dummy md5");
      expect(cache.getMd5sForStoredDefintions()).toEqual(["dummy md5"]);
    });
  });
});
