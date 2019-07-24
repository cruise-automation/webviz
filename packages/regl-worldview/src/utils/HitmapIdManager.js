// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { last } from "lodash";

export function fillArray(start: number, length: number): Array<number> {
  return new Array(length).fill(0).map((_, index) => start + index);
}

export default class HitmapIdManager {
  _invalidatedHitmapIdRanges: Array<[number, number]> = []; // Ranges are [closed, closed]
  _nextHitmapId = 1;
  _commandInstanceIdToHitmapIdRanges: { [string]: Array<[number, number]> } = {};
  _hitmapInstancedIdMap: { [key: number]: number } = {}; // map hitmapId to the instance index

  assignNextIds(commandInstanceId: string, idCount: number, { isInstanced }: { isInstanced?: boolean } = {}) {
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

    this._commandInstanceIdToHitmapIdRanges[commandInstanceId] =
      this._commandInstanceIdToHitmapIdRanges[commandInstanceId] || [];
    this._commandInstanceIdToHitmapIdRanges[commandInstanceId].push([ids[0], last(ids)]);
    if (isInstanced) {
      ids.forEach((id, index) => {
        this._hitmapInstancedIdMap[id] = index;
      });
    }

    return ids;
  }

  getInstanceIndex(hitmapId: number): ?number {
    return this._hitmapInstancedIdMap[hitmapId];
  }

  invalidateHitmapIds(commandInstanceId: string) {
    const assignedHitmapIdRanges = this._commandInstanceIdToHitmapIdRanges[commandInstanceId];
    if (!assignedHitmapIdRanges) {
      throw new Error("Command instance ID not found");
    }

    // Mark all assigned hitmap ids as invalid
    this._invalidatedHitmapIdRanges.push(...assignedHitmapIdRanges);
    delete this._commandInstanceIdToHitmapIdRanges[commandInstanceId];
    // Delete all instanced
    for (const [start, end] of assignedHitmapIdRanges) {
      if (this._hitmapInstancedIdMap[start] != null) {
        for (let id = start; id <= end; id++) {
          delete this._hitmapInstancedIdMap[id];
        }
      }
    }
  }
}
