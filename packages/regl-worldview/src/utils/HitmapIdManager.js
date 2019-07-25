// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import last from "lodash/last";
import React from "react";

import type { HitmapId, MouseEventObject, BaseShape } from "../types";

export function fillArray(start: number, length: number): Array<number> {
  return new Array(length).fill(0).map((_, index) => start + index);
}

type CommandInstance = React.Component<any>;

export default class HitmapIdManager {
  _hitmapIdMap: { [HitmapId]: BaseShape } = {}; // map hitmapId to the original marker object
  _nextHitmapId = 1;
  _hitmapInstancedIdMap: { [HitmapId]: number } = {}; // map hitmapId to the instance index

  assignNextIds = (
    command: CommandInstance,
    idCount: number,
    drawProp: BaseShape,
    options?: { isInstanced?: boolean }
  ): Array<HitmapId> => {
    if (idCount < 1) {
      throw new Error("Must get at least 1 id");
    }

    const ids: Array<number> = [];
    // First, pull from old hitmap ids ranges

    const newIds = fillArray(this._nextHitmapId, idCount - ids.length);
    this._nextHitmapId = last(newIds) + 1;
    ids.push(...newIds);

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

  reset = () => {
    this._hitmapIdMap = {};
    this._nextHitmapId = 1;
    this._hitmapInstancedIdMap = {};
  };

  getDrawPropByHitmapId = (hitmapId: number): MouseEventObject => {
    return { object: this._hitmapIdMap[hitmapId], instanceIndex: this._hitmapInstancedIdMap[hitmapId] };
  };
}
