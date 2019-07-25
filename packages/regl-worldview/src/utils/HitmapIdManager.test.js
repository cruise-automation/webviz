// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import HitmapIdManager, { fillArray } from "./HitmapIdManager";

describe("HitmapIdManager", () => {
  describe("assignNextIds", () => {
    const commandInstanceId = "test";

    it("assigns a single ID correctly", () => {
      const manager = new HitmapIdManager<*, *>();
      const ids = manager.assignNextIds(commandInstanceId, 1);
      expect(ids).toEqual([1]);
      const nextIds = manager.assignNextIds(commandInstanceId, 1);
      expect(nextIds).toEqual([2]);
    });

    it("assigns multiple IDs correctly", () => {
      const manager = new HitmapIdManager<*, *>();
      const ids = manager.assignNextIds(commandInstanceId, 2);
      expect(ids).toEqual([1, 2]);
      const nextIds = manager.assignNextIds(commandInstanceId, 2);
      expect(nextIds).toEqual([3, 4]);
    });

    it("assigns instance indices isInstanced is true", () => {
      const manager = new HitmapIdManager<*, *>();
      const ids = manager.assignNextIds(commandInstanceId, 2, { isInstanced: true });
      expect(manager.getInstanceIndex(ids[0])).toEqual(0);
      expect(manager.getInstanceIndex(ids[1])).toEqual(1);
    });

    it("does not assign instance indices isInstanced is false", () => {
      const manager = new HitmapIdManager<*, *>();
      const ids = manager.assignNextIds(commandInstanceId, 2);
      expect(manager.getInstanceIndex(ids[0])).toEqual(undefined);
      expect(manager.getInstanceIndex(ids[1])).toEqual(undefined);
    });
  });

  describe("invalidateHitmapIds", () => {
    const commandInstanceId = "test";
    const commandInstanceId2 = "test2";

    function createTest(name, invalidatedCount, initialCount, nextCount) {
      it(name, () => {
        const manager = new HitmapIdManager<*, *>();
        manager.assignNextIds(commandInstanceId, invalidatedCount);

        manager.invalidateHitmapIds(commandInstanceId);
        // eslint-disable-next-line no-underscore-dangle
        expect(manager._commandInstanceIdToHitmapIdRanges[commandInstanceId]).toEqual(undefined);

        const ids = manager.assignNextIds(commandInstanceId2, initialCount);
        expect(ids).toEqual(fillArray(1, initialCount));
        const nextIds = manager.assignNextIds(commandInstanceId2, nextCount);
        expect(nextIds).toEqual(fillArray(1 + initialCount, nextCount));
      });
    }

    createTest("invalidates a single ID with single IDs after", 1, 1, 1);
    createTest("invalidates a range with ranges after", 2, 2, 2);
    createTest("invalidates a single ID with ranges after", 1, 2, 2);
    createTest("invalidates a long range with smaller ranges after", 3, 2, 2);
    createTest("invalidates a range with a single ID and then a range", 2, 1, 2);

    it("invalidates instance indices", () => {
      const manager = new HitmapIdManager<*, *>();
      const ids = manager.assignNextIds(commandInstanceId, 2, { isInstanced: true });
      manager.invalidateHitmapIds(commandInstanceId);
      // eslint-disable-next-line no-underscore-dangle
      expect(Object.keys(manager._hitmapInstancedIdMap)).toEqual([]);
      expect(manager.getInstanceIndex(ids[0])).toEqual(undefined);
      expect(manager.getInstanceIndex(ids[1])).toEqual(undefined);
    });
  });
});
