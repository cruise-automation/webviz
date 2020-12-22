// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import {
  CacheForTesting as ParseMessageDefinitionsCache,
  setStorageForTest,
  getStorageForTest,
  restoreStorageForTest,
} from "./parseMessageDefinitionsCache";
import sendNotification from "webviz-core/src/util/sendNotification";
import Storage, { clearBustStorageFnsMap } from "webviz-core/src/util/Storage";

const storage = new Storage();

describe("parseMessageDefinitionsCache", () => {
  beforeEach(() => {
    storage.clear();
    clearBustStorageFnsMap();
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
      const localStorageItem = storage.getItem("msgdefn/dummy md5");
      expect(localStorageItem).toEqual(definition);
    });

    it("busts the message definition cache when running out of storage space", () => {
      setStorageForTest(87);
      const mockStorage = getStorageForTest();
      const previousCache = new ParseMessageDefinitionsCache();
      previousCache.parseMessageDefinition("string value1", "md5 to remove");
      expect(mockStorage.getItem("msgdefn/md5 to remove")).not.toEqual(undefined);

      mockStorage.setItem("test", "some new value");
      expect(mockStorage.getItem("msgdefn/md5 to remove")).toEqual(undefined);
      expect(mockStorage.getItem("test")).toEqual("some new value");

      restoreStorageForTest();
    });

    it("on localStorage failure, clears and reloads all localStorage definitions", () => {
      const previousCache = new ParseMessageDefinitionsCache();
      previousCache.parseMessageDefinition("string value1", "md5 to remove");
      expect(storage.getItem("msgdefn/md5 to remove")).not.toEqual(undefined);
      storage.setItem("test", "test");

      jest.spyOn(Storage.prototype, "setItem").mockImplementationOnce((key, value) => {
        // Clear the previous cache.
        storage.removeItem("msgdefn/md5 to remove");
        storage.setItem(key, value);
      });
      const cache = new ParseMessageDefinitionsCache();

      const definition1 = cache.parseMessageDefinition("string value2", "dummy md5 1");
      const definition2 = cache.parseMessageDefinition("string value", "dummy md5");

      // Both keys should be in localStorage.
      const localStorageItem1 = storage.getItem("msgdefn/dummy md5 1");
      expect(localStorageItem1).toEqual(definition1);
      const localStorageItem2 = storage.getItem("msgdefn/dummy md5");
      expect(localStorageItem2).toEqual(definition2);
      // The key from the previous cache should be removed.
      expect(storage.getItem("msgdefn/md5 to remove")).toEqual(undefined);
      // Any non-message definition localStorage keys should be restored.
      expect(storage.getItem("test")).toEqual("test");
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
      // Failed even though we cleared the cache, so we stop using localStorage.
      expect(setItemCount).toEqual(1);
      sendNotification.expectCalledDuringTest();
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

  describe("getMd5sForStoredDefinitions", () => {
    it("gets all md5s for the stored definitions", () => {
      const cache = new ParseMessageDefinitionsCache();
      cache.parseMessageDefinition("string value", "dummy md5");
      expect(cache.getMd5sForStoredDefinitions()).toEqual(["dummy md5"]);
    });
  });
});
