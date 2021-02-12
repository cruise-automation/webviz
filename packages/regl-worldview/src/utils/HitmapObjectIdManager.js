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

type CommandType = Command<any>;

/*
 * This object manages the mapping between objects that are rendered into the scene and their IDs.
 * It supplies an API for generating IDs for a rendered object and then accessing those objects based on their ID.
 */
export default class HitmapObjectIdManager {
  _objectsByObjectHitmapIdMap: { [ObjectHitmapId]: Object } = {};
  _commandsByObjectMap: Map<Object, CommandType> = new Map();
  _nextObjectHitmapId = 1;
  _instanceIndexByObjectHitmapIdMap: { [ObjectHitmapId]: number } = {};

  assignNextColors = (command: CommandType, object: Object, count: number): Vec4[] => {
    if (count < 1) {
      throw new Error("Must get at least 1 id");
    }

    const ids: ObjectHitmapId[] = fillArray(this._nextObjectHitmapId, count);
    this._nextObjectHitmapId = last(ids) + 1;

    // Instanced rendering - add to the instanced ID map.
    if (count > 1) {
      ids.forEach((id, index) => {
        this._instanceIndexByObjectHitmapIdMap[id] = index;
      });
    }

    // Store the mapping of ID to original marker object
    for (const id of ids) {
      this._objectsByObjectHitmapIdMap[id] = object;
    }
    this._commandsByObjectMap.set(object, command);

    // Return colors from the IDs.
    const colors = ids.map((id) => intToRGB(id));
    return colors;
  };

  getObjectByObjectHitmapId = (objectHitmapId: ObjectHitmapId): MouseEventObject => {
    return {
      object: this._objectsByObjectHitmapIdMap[objectHitmapId],
      instanceIndex: this._instanceIndexByObjectHitmapIdMap[objectHitmapId],
    };
  };

  getCommandForObject = (object: Object): ?CommandType => {
    return this._commandsByObjectMap.get(object);
  };
}
