// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { CommandBoundAssignNextIds } from "../types";
import { intToRGB } from "./commandUtils";

export const nonInstancedGetHitmap = <T: Object>(props: Array<T> | T, assignNextIds: CommandBoundAssignNextIds) => {
  const propsArray = Array.isArray(props) ? props : [props];
  const hitmapArray: Array<T> = propsArray.map((prop) => {
    const hitmapProp = { ...prop };
    const [id] = assignNextIds({ type: "single", callbackObject: prop });
    const hitmapColor = intToRGB(id);
    hitmapProp.color = hitmapColor;
    if (hitmapProp.points) {
      hitmapProp.colors = new Array(hitmapProp.points.length).fill(hitmapColor);
    }
    return hitmapProp;
  });

  if (Array.isArray(props)) {
    return hitmapArray;
  }
  return hitmapArray[0];
};

export const createInstancedGetHitmap = ({ pointCountPerInstance }: { pointCountPerInstance: number }) => <T: Object>(
  props: Array<T> | T,
  assignNextIds: CommandBoundAssignNextIds
) => {
  const propsArray = Array.isArray(props) ? props : [props];
  const hitmapArray: Array<T> = propsArray.map((prop: T) => {
    const hitmapProp = { ...prop };
    const instanceCount = (hitmapProp.points && Math.floor(hitmapProp.points.length / pointCountPerInstance)) || 1;
    const newIds = assignNextIds({ type: "instanced", count: instanceCount, callbackObject: prop });
    const startColor = intToRGB(newIds[0]);
    if (hitmapProp.points && hitmapProp.points.length) {
      const allColors = new Array(hitmapProp.points.length).fill().map(() => startColor);
      const idColors = newIds.map((id) => intToRGB(id));
      for (let i = 0; i < instanceCount; i++) {
        for (let j = 0; j < pointCountPerInstance; j++) {
          const idx = i * pointCountPerInstance + j;
          allColors[idx] = idColors[i];
        }
      }
      hitmapProp.colors = allColors;
    } else {
      hitmapProp.color = startColor;
    }
    return hitmapProp;
  });

  if (Array.isArray(props)) {
    return hitmapArray;
  }
  return hitmapArray[0];
};
