// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import HitmapObjectIdManager from "./HitmapObjectIdManager";

describe("HitmapObjectIdManager", () => {
  describe("assignNextIds", () => {
    const commandInstanceId: any = "test";
    const drawProp: any = { isDrawProp: true };

    it("assigns a single ID correctly", () => {
      const manager: HitmapObjectIdManager = new HitmapObjectIdManager();
      const ids = manager.assignNextIds(commandInstanceId, { type: "single", callbackObject: drawProp });
      expect(ids).toEqual([1]);
      const nextIds = manager.assignNextIds(commandInstanceId, { type: "single", callbackObject: drawProp });
      expect(nextIds).toEqual([2]);
    });

    it("assigns multiple IDs correctly", () => {
      const manager: HitmapObjectIdManager = new HitmapObjectIdManager();
      const ids = manager.assignNextIds(commandInstanceId, { type: "instanced", callbackObject: drawProp, count: 2 });
      expect(ids).toEqual([1, 2]);
      const nextIds = manager.assignNextIds(commandInstanceId, {
        type: "instanced",
        callbackObject: drawProp,
        count: 2,
      });
      expect(nextIds).toEqual([3, 4]);
    });

    it("assigns instance indices isInstanced is true", () => {
      const manager: HitmapObjectIdManager = new HitmapObjectIdManager();
      const ids = manager.assignNextIds(commandInstanceId, { type: "instanced", callbackObject: drawProp, count: 2 });
      expect(manager.getObjectByObjectHitmapId(ids[0]).instanceIndex).toEqual(0);
      expect(manager.getObjectByObjectHitmapId(ids[1]).instanceIndex).toEqual(1);
    });

    it("does not assign instance indices isInstanced is false", () => {
      const manager = new HitmapObjectIdManager();
      const ids = manager.assignNextIds(commandInstanceId, { type: "single", callbackObject: drawProp });
      expect(manager.getObjectByObjectHitmapId(ids[0]).instanceIndex).toEqual(undefined);
    });
  });

  describe("getObjectByObjectHitmapId", () => {
    const commandInstanceId: any = "test";
    const drawProp: any = { isDrawProp: true };

    it("does not error when the hitmap id is not found", () => {
      const manager: HitmapObjectIdManager = new HitmapObjectIdManager();
      expect(manager.getObjectByObjectHitmapId(100)).toEqual({ object: undefined, instanceIndex: undefined });
    });

    it("returns the right hitmap object", () => {
      const manager: HitmapObjectIdManager = new HitmapObjectIdManager();
      const ids = manager.assignNextIds(commandInstanceId, { type: "instanced", callbackObject: drawProp, count: 2 });
      // Require exact equality here
      expect(manager.getObjectByObjectHitmapId(ids[0]).object).toBe(drawProp);
      expect(manager.getObjectByObjectHitmapId(ids[1]).object).toBe(drawProp);
    });
  });

  describe("reset", () => {
    const commandInstanceId: any = "test";
    const drawProp: any = { isDrawProp: true };

    it("resets the hitmap", () => {
      const manager: HitmapObjectIdManager = new HitmapObjectIdManager();
      manager.assignNextIds(commandInstanceId, { type: "single", callbackObject: drawProp });

      manager.reset(commandInstanceId);
      expect(manager.getObjectByObjectHitmapId(1).object).toEqual(undefined);

      const ids = manager.assignNextIds(commandInstanceId, { type: "single", callbackObject: drawProp });
      expect(ids).toEqual([1]);
    });
  });
});
