// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import HitmapIdManager, { fillArray } from "./HitmapIdManager";

describe("HitmapIdManager", () => {
  describe("assignNextIds", () => {
    const commandInstanceId: any = "test";
    const drawProp: any = { isDrawProp: true };

    it("assigns a single ID correctly", () => {
      const manager: HitmapIdManager = new HitmapIdManager();
      const ids = manager.assignNextIds(commandInstanceId, 1, drawProp);
      expect(ids).toEqual([1]);
      const nextIds = manager.assignNextIds(commandInstanceId, 1, drawProp);
      expect(nextIds).toEqual([2]);
    });

    it("assigns multiple IDs correctly", () => {
      const manager: HitmapIdManager = new HitmapIdManager();
      const ids = manager.assignNextIds(commandInstanceId, 2, drawProp);
      expect(ids).toEqual([1, 2]);
      const nextIds = manager.assignNextIds(commandInstanceId, 2, drawProp);
      expect(nextIds).toEqual([3, 4]);
    });

    it("assigns instance indices isInstanced is true", () => {
      const manager: HitmapIdManager = new HitmapIdManager();
      const ids = manager.assignNextIds(commandInstanceId, 2, drawProp, { isInstanced: true });
      expect(manager.getDrawPropByHitmapId(ids[0]).instanceIndex).toEqual(0);
      expect(manager.getDrawPropByHitmapId(ids[1]).instanceIndex).toEqual(1);
    });

    it("does not assign instance indices isInstanced is false", () => {
      const manager = new HitmapIdManager();
      const ids = manager.assignNextIds(commandInstanceId, 2, drawProp);
      expect(manager.getDrawPropByHitmapId(ids[0]).instanceIndex).toEqual(undefined);
      expect(manager.getDrawPropByHitmapId(ids[1]).instanceIndex).toEqual(undefined);
    });
  });

  describe("getDrawPropByHitmapId", () => {
    const commandInstanceId: any = "test";
    const drawProp: any = { isDrawProp: true };

    it("does not error when the hitmap id is not found", () => {
      const manager: HitmapIdManager = new HitmapIdManager();
      expect(manager.getDrawPropByHitmapId(100)).toEqual({ object: undefined, instanceIndex: undefined });
    });

    it("returns the right hitmap object", () => {
      const manager: HitmapIdManager = new HitmapIdManager();
      const ids = manager.assignNextIds(commandInstanceId, 2, drawProp);
      // Require exact equality here
      expect(manager.getDrawPropByHitmapId(ids[0]).object).toBe(drawProp);
      expect(manager.getDrawPropByHitmapId(ids[1]).object).toBe(drawProp);
    });
  });

  describe("invalidateHitmapIds", () => {
    const commandInstanceId: any = "test";
    const commandInstanceId2: any = "test2";
    const drawProp: any = { isDrawProp: true };

    function createTest(name, invalidatedCount, initialCount, nextCount) {
      it(name, () => {
        const manager: HitmapIdManager = new HitmapIdManager();
        manager.assignNextIds(commandInstanceId, invalidatedCount, drawProp);

        manager.invalidateHitmapIds(commandInstanceId);
        // eslint-disable-next-line no-underscore-dangle
        expect(manager._commandInstanceToHitmapIdRanges[commandInstanceId]).toEqual(undefined);

        const ids = manager.assignNextIds(commandInstanceId2, initialCount, drawProp);
        expect(ids).toEqual(fillArray(1, initialCount));
        const nextIds = manager.assignNextIds(commandInstanceId2, nextCount, drawProp);
        expect(nextIds).toEqual(fillArray(1 + initialCount, nextCount));
      });
    }

    createTest("invalidates a single ID with single IDs after", 1, 1, 1);
    createTest("invalidates a range with ranges after", 2, 2, 2);
    createTest("invalidates a single ID with ranges after", 1, 2, 2);
    createTest("invalidates a long range with smaller ranges after", 3, 2, 2);
    createTest("invalidates a range with a single ID and then a range", 2, 1, 2);

    it("invalidates instance indices", () => {
      const manager: HitmapIdManager = new HitmapIdManager();
      const ids = manager.assignNextIds(commandInstanceId, 2, drawProp, { isInstanced: true });
      manager.invalidateHitmapIds(commandInstanceId);
      // eslint-disable-next-line no-underscore-dangle
      expect(Object.keys(manager._hitmapInstancedIdMap)).toEqual([]);
      expect(manager.getDrawPropByHitmapId(ids[0]).instanceIndex).toEqual(undefined);
      expect(manager.getDrawPropByHitmapId(ids[1]).instanceIndex).toEqual(undefined);
    });
  });
});
