// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { getIdFromColor, intToRGB } from "./commandUtils";
import HitmapObjectIdManager from "./HitmapObjectIdManager";

describe("HitmapObjectIdManager", () => {
  describe("assignNextColors", () => {
    const commandInstanceId: any = "test";
    const drawProp: any = { isDrawProp: true };

    it("assigns a single ID correctly", () => {
      const manager: HitmapObjectIdManager = new HitmapObjectIdManager();
      const colors = manager.assignNextColors(commandInstanceId, { type: "single", object: drawProp });
      expect(colors).toEqual([intToRGB(1)]);
      const nextColors = manager.assignNextColors(commandInstanceId, { type: "single", object: drawProp });
      expect(nextColors).toEqual([intToRGB(2)]);
    });

    it("assigns multiple IDs correctly", () => {
      const manager: HitmapObjectIdManager = new HitmapObjectIdManager();
      const colors = manager.assignNextColors(commandInstanceId, { type: "instanced", object: drawProp, count: 2 });
      expect(colors).toEqual([intToRGB(1), intToRGB(2)]);
      const nextColors = manager.assignNextColors(commandInstanceId, {
        type: "instanced",
        object: drawProp,
        count: 2,
      });
      expect(nextColors).toEqual([intToRGB(3), intToRGB(4)]);
    });

    it("assigns instance indices isInstanced is true", () => {
      const manager: HitmapObjectIdManager = new HitmapObjectIdManager();
      const colors = manager.assignNextColors(commandInstanceId, { type: "instanced", object: drawProp, count: 2 });
      expect(manager.getObjectByObjectHitmapId(getIdFromColor(colors[0])).instanceIndex).toEqual(0);
      expect(manager.getObjectByObjectHitmapId(getIdFromColor(colors[1])).instanceIndex).toEqual(1);
    });

    it("does not assign instance indices isInstanced is false", () => {
      const manager = new HitmapObjectIdManager();
      const colors = manager.assignNextColors(commandInstanceId, { type: "single", object: drawProp });
      expect(manager.getObjectByObjectHitmapId(getIdFromColor(colors[0])).instanceIndex).toEqual(undefined);
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
      const colors = manager.assignNextColors(commandInstanceId, { type: "instanced", object: drawProp, count: 2 });
      // Require exact equality here
      expect(manager.getObjectByObjectHitmapId(getIdFromColor(colors[0])).object).toBe(drawProp);
      expect(manager.getObjectByObjectHitmapId(getIdFromColor(colors[1])).object).toBe(drawProp);
    });
  });

  describe("reset", () => {
    const commandInstanceId: any = "test";
    const drawProp: any = { isDrawProp: true };

    it("resets the hitmap", () => {
      const manager: HitmapObjectIdManager = new HitmapObjectIdManager();
      manager.assignNextColors(commandInstanceId, { type: "single", object: drawProp });

      manager.reset();
      expect(manager.getObjectByObjectHitmapId(1).object).toEqual(undefined);

      const colors = manager.assignNextColors(commandInstanceId, { type: "single", object: drawProp });
      expect(colors).toEqual([intToRGB(1)]);
    });
  });
});
