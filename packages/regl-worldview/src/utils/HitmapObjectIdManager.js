// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import last from "lodash/last";
import React from "react";

import type { ObjectHitmapId, MouseEventObject, BaseShape } from "../types";

function fillArray(start: number, length: number): number[] {
  return new Array(length).fill(0).map((_, index) => start + index);
}

type CommandInstance = React.Component<any>;

/*
 * This object manages the mapping between objects that are rendered into the scene and their IDs.
 * It supplies an API for generating IDs for a rendered object and then accessing those objects based on their ID.
 */
export default class HitmapObjectIdManager {
  _objectsByObjectHitmapIdMap: { [ObjectHitmapId]: BaseShape } = {};
  _commandToObjectHitmapIdsMap: Map<CommandInstance, ObjectHitmapId[]> = new Map();
  _nextObjectHitmapId = 1;
  _hitmapInstancedIdMap: { [ObjectHitmapId]: number } = {}; // map objectHitmapId to the instance index

  assignNextIds = (
    command: CommandInstance,
    options:
      | { type: "single", callbackObject: BaseShape }
      | { type: "instanced", callbackObject: BaseShape, count: number }
  ): ObjectHitmapId[] => {
    const idCount = options.type === "instanced" ? options.count : 1;
    if (idCount < 1) {
      throw new Error("Must get at least 1 id");
    }

    const ids: ObjectHitmapId[] = [];
    // First, pull from old hitmap ids ranges

    const newIds = fillArray(this._nextObjectHitmapId, idCount - ids.length);
    this._nextObjectHitmapId = last(newIds) + 1;
    ids.push(...newIds);

    if (options.type === "instanced") {
      ids.forEach((id, index) => {
        this._hitmapInstancedIdMap[id] = index;
      });
    }

    // Store the mapping of ID to original marker object
    for (const id of ids) {
      this._objectsByObjectHitmapIdMap[id] = options.callbackObject;
    }
    const existingIds = this._commandToObjectHitmapIdsMap.get(command) || [];
    this._commandToObjectHitmapIdsMap.set(command, existingIds.concat(ids));

    return ids;
  };

  reset = () => {
    this._objectsByObjectHitmapIdMap = {};
    this._commandToObjectHitmapIdsMap = new Map();
    this._nextObjectHitmapId = 1;
    this._hitmapInstancedIdMap = {};
  };

  getObjectByObjectHitmapId = (objectHitmapId: ObjectHitmapId): MouseEventObject => {
    return {
      object: this._objectsByObjectHitmapIdMap[objectHitmapId],
      instanceIndex: this._hitmapInstancedIdMap[objectHitmapId],
    };
  };

  getObjectHitmapIdsForCommand = (command: CommandInstance): ObjectHitmapId[] => {
    return this._commandToObjectHitmapIdsMap.get(command) || [];
  };
}
