// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { GetHitmap, CommandBoundAssignNextIds } from "../types";
import { intToRGB } from "./commandUtils";

export const nonInstancedGetHitmap: GetHitmap = <T: Object>(prop: T, assignNextIds: CommandBoundAssignNextIds) => {
  const hitmapProp = { ...prop };
  const [id] = assignNextIds(prop, 1);
  const hitmapColor = intToRGB(id);
  hitmapProp.color = hitmapColor;
  if (hitmapProp.points) {
    hitmapProp.colors = new Array(hitmapProp.points.length).fill(hitmapColor);
  }
  return hitmapProp;
};

export const createInstancedGetHitmap: ({ pointCountPerInstance: number }) => GetHitmap = ({
  pointCountPerInstance,
}) => <T: Object>(prop: T, assignNextIds: CommandBoundAssignNextIds) => {
  const hitmapProp = { ...prop };
  const instanceCount = (hitmapProp.points && Math.floor(hitmapProp.points.length / pointCountPerInstance)) || 1;
  const newIds = assignNextIds(prop, instanceCount);
  const startColor = intToRGB(newIds[0]);
  const allColors = new Array(hitmapProp.points.length).fill().map(() => startColor);
  const idColors = newIds.map((id) => intToRGB(id));
  for (let i = 0; i < instanceCount; i++) {
    for (let j = 0; j < pointCountPerInstance; j++) {
      const idx = i * pointCountPerInstance + j;
      allColors[idx] = idColors[i];
    }
  }
  hitmapProp.colors = allColors;
  return hitmapProp;
};
