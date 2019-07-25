// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import last from "lodash/last";

import type { HitmapId, MouseEventObject } from "../types";

export function fillArray(start: number, length: number): Array<number> {
  return new Array(length).fill(0).map((_, index) => start + index);
}

// UniqueCommandType can be any type that is unique to each command using this hitmap id manager, such as an ID or the
// instance itself.
export default class HitmapIdManager<UniqueCommandType: mixed, DrawProp: mixed> {
  _invalidatedHitmapIdRanges: Array<[HitmapId, HitmapId]> = []; // Ranges are [closed, closed]
  _hitmapIdMap: { [HitmapId]: DrawProp } = {}; // map hitmapId to the original marker object
  _nextHitmapId = 1;
  _commandInstanceToHitmapIdRanges: Map<UniqueCommandType, HitmapId> = new Map();
  _hitmapInstancedIdMap: { [HitmapId]: number } = {}; // map hitmapId to the instance index

  assignNextIds = (
    command: UniqueCommandType,
    idCount: number,
    drawProp: DrawProp,
    options?: { isInstanced?: boolean }
  ): Array<HitmapId> => {
    if (idCount < 1) {
      throw new Error("Must get at least 1 id");
    }

    const ids: Array<number> = [];
    // First, pull from old hitmap ids ranges
    while (this._invalidatedHitmapIdRanges.length && ids.length < idCount) {
      const [rangeStart, rangeEnd] = this._invalidatedHitmapIdRanges.shift();
      const rangeLength = rangeEnd - rangeStart + 1;
      const neededIdsCount = idCount - ids.length;
      if (rangeLength >= neededIdsCount) {
        const newIds = fillArray(rangeStart, neededIdsCount);
        ids.push(...newIds);
        // We still have more room in the range, so push it back as a hitmap range.
        if (rangeLength > neededIdsCount) {
          const newRange = [last(ids) + 1, rangeEnd];
          this._invalidatedHitmapIdRanges.unshift(newRange);
        }
      } else {
        const newIds = fillArray(rangeStart, rangeLength);
        ids.push(...newIds);
      }
    }

    if (ids.length < idCount) {
      const newIds = fillArray(this._nextHitmapId, idCount - ids.length);
      this._nextHitmapId = last(newIds) + 1;
      ids.push(...newIds);
    }

    const commandHitmapRange = this._commandInstanceToHitmapIdRanges.get(command) || [];
    commandHitmapRange.push([ids[0], last(ids)]);
    this._commandInstanceToHitmapIdRanges.set(command, commandHitmapRange);
    if (options && options.isInstanced) {
      ids.forEach((id, index) => {
        this._hitmapInstancedIdMap[id] = index;
      });
    }

    // Store the mapping of ID to original marker object
    for (const id of ids) {
      this._hitmapIdMap[id] = drawProp;
    }

    return ids;
  };

  getDrawPropByHitmapId = (hitmapId: number): MouseEventObject => {
    return { object: this._hitmapIdMap[hitmapId], instanceIndex: this._hitmapInstancedIdMap[hitmapId] };
  };

  invalidateHitmapIds = (command: UniqueCommandType) => {
    const assignedHitmapIdRanges = this._commandInstanceToHitmapIdRanges.get(command);
    if (!assignedHitmapIdRanges) {
      return;
    }

    // Mark all assigned hitmap ids as invalid
    this._invalidatedHitmapIdRanges.push(...assignedHitmapIdRanges);
    this._commandInstanceToHitmapIdRanges.delete(command);
    // Delete all instanced
    for (const [start, end] of assignedHitmapIdRanges) {
      if (this._hitmapInstancedIdMap[start] != null) {
        for (let id = start; id <= end; id++) {
          delete this._hitmapInstancedIdMap[id];
        }
      }
    }
  };
}
