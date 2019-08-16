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
    const childObject: any = { isChildObject: true };

    it("assigns a single color correctly", () => {
      const manager: HitmapObjectIdManager = new HitmapObjectIdManager();
      const colors = manager.assignNextColors(commandInstanceId, childObject, 1);
      expect(colors).toEqual([intToRGB(1)]);
      const nextColors = manager.assignNextColors(commandInstanceId, childObject, 1);
      expect(nextColors).toEqual([intToRGB(2)]);
    });

    it("assigns multiple colors correctly", () => {
      const manager: HitmapObjectIdManager = new HitmapObjectIdManager();
      const colors = manager.assignNextColors(commandInstanceId, childObject, 2);
      expect(colors).toEqual([intToRGB(1), intToRGB(2)]);
      const nextColors = manager.assignNextColors(commandInstanceId, childObject, 2);
      expect(nextColors).toEqual([intToRGB(3), intToRGB(4)]);
    });

    it("assigns instance indices if there is more than 1 color to assign", () => {
      const manager: HitmapObjectIdManager = new HitmapObjectIdManager();
      const colors = manager.assignNextColors(commandInstanceId, childObject, 2);
      expect(manager.getObjectByObjectHitmapId(getIdFromColor(colors[0])).instanceIndex).toEqual(0);
      expect(manager.getObjectByObjectHitmapId(getIdFromColor(colors[1])).instanceIndex).toEqual(1);
    });

    it("does not assign instance indices if there is only 1 color to assign", () => {
      const manager = new HitmapObjectIdManager();
      const colors = manager.assignNextColors(commandInstanceId, childObject, 1);
      expect(manager.getObjectByObjectHitmapId(getIdFromColor(colors[0])).instanceIndex).toEqual(undefined);
    });
  });

  describe("getObjectByObjectHitmapId", () => {
    const commandInstanceId: any = "test";
    const childObject: any = { isChildObject: true };

    it("does not error when the hitmap id is not found", () => {
      const manager: HitmapObjectIdManager = new HitmapObjectIdManager();
      expect(manager.getObjectByObjectHitmapId(100)).toEqual({ object: undefined, instanceIndex: undefined });
    });

    it("returns the correct hitmap object", () => {
      const manager: HitmapObjectIdManager = new HitmapObjectIdManager();
      const colors = manager.assignNextColors(commandInstanceId, childObject, 2);
      // Require exact equality here
      expect(manager.getObjectByObjectHitmapId(getIdFromColor(colors[0])).object).toBe(childObject);
      expect(manager.getObjectByObjectHitmapId(getIdFromColor(colors[1])).object).toBe(childObject);
    });
  });
});
