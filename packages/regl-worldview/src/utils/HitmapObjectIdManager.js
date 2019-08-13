// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import last from "lodash/last";

import Command from "../commands/Command";
import type { ObjectHitmapId, Vec4, MouseEventObject } from "../types";
import { intToRGB } from "./commandUtils";

function fillArray(start: number, length: number): number[] {
  return new Array(length).fill(0).map((_, index) => start + index);
}

/*
 * This object manages the mapping between objects that are rendered into the scene and their IDs.
 * It supplies an API for generating IDs for a rendered object and then accessing those objects based on their ID.
 */
export default class HitmapObjectIdManager {
  _objectsByObjectHitmapIdMap: { [ObjectHitmapId]: Object } = {};
  _objectToCommandMap: Map<Object, Command> = new Map();
  _nextObjectHitmapId = 1;
  _hitmapInstancedIdMap: { [ObjectHitmapId]: number } = {}; // map objectHitmapId to the instance index

  assignNextColors = (
    command: Command,
    options: { type: "single", object: Object } | { type: "instanced", object: Object, count: number }
  ): Vec4[] => {
    const idCount = options.type === "instanced" ? options.count : 1;
    if (idCount < 1) {
      throw new Error("Must get at least 1 id");
    }

    const ids: ObjectHitmapId[] = fillArray(this._nextObjectHitmapId, idCount);
    this._nextObjectHitmapId = last(ids) + 1;

    if (options.type === "instanced") {
      ids.forEach((id, index) => {
        this._hitmapInstancedIdMap[id] = index;
      });
    }

    // Store the mapping of ID to original marker object
    for (const id of ids) {
      this._objectsByObjectHitmapIdMap[id] = options.object;
    }
    this._objectToCommandMap.set(options.object, command);

    // Return colors from the IDs.
    const colors = ids.map((id) => intToRGB(id));
    return colors;
  };

  reset = () => {
    this._objectsByObjectHitmapIdMap = {};
    this._objectToCommandMap = new Map();
    this._nextObjectHitmapId = 1;
    this._hitmapInstancedIdMap = {};
  };

  getObjectByObjectHitmapId = (objectHitmapId: ObjectHitmapId): MouseEventObject => {
    return {
      object: this._objectsByObjectHitmapIdMap[objectHitmapId],
      instanceIndex: this._hitmapInstancedIdMap[objectHitmapId],
    };
  };

  getCommandForObject = (object: Object): ?Command => {
    return this._objectToCommandMap.get(object);
  };
}
