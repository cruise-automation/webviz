// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { AssignNextIdsFn, MouseEventObject } from "../types";
import { intToRGB } from "./commandUtils";

function nonInstancedGetHitmapFromSingleProp<T: any>(
  prop: T,
  assignNextIds: AssignNextIdsFn,
  seenObjects: MouseEventObject[]
): ?T {
  if (seenObjects.some(({ object }) => object === prop)) {
    return null;
  }
  const hitmapProp = { ...prop };
  const [id] = assignNextIds({ type: "single", callbackObject: prop });
  const hitmapColor = intToRGB(id);
  hitmapProp.color = hitmapColor;
  if (hitmapProp.points && hitmapProp.points.length) {
    hitmapProp.colors = new Array(hitmapProp.points.length).fill(hitmapColor);
  }
  return hitmapProp;
}

export const nonInstancedGetHitmap = <T: any>(
  props: T,
  assignNextIds: AssignNextIdsFn,
  seenObjects: MouseEventObject[]
): ?T => {
  if (Array.isArray(props)) {
    return props.map((prop) => nonInstancedGetHitmapFromSingleProp(prop, assignNextIds, seenObjects)).filter(Boolean);
  }
  return nonInstancedGetHitmapFromSingleProp(props, assignNextIds, seenObjects);
};

function instancedGetHitmapFromSingleProp<T: any>(
  prop: T,
  assignNextIds: AssignNextIdsFn,
  seenObjects: MouseEventObject[],
  pointCountPerInstance
): ?T {
  const filteredIndices = seenObjects
    .map(({ object, instanceIndex }) => (object === prop ? instanceIndex : null))
    .filter((instanceIndex) => typeof instanceIndex === "number");
  const hitmapProp = { ...prop };
  const instanceCount = (hitmapProp.points && Math.ceil(hitmapProp.points.length / pointCountPerInstance)) || 1;
  const newIds = assignNextIds({ type: "instanced", count: instanceCount, callbackObject: prop });
  const startColor = intToRGB(newIds[0]);
  if (hitmapProp.points && hitmapProp.points.length) {
    const allColors = new Array(hitmapProp.points.length).fill().map(() => startColor);
    const idColors = newIds.map((id) => intToRGB(id));
    for (let i = 0; i < instanceCount; i++) {
      for (let j = 0; j < pointCountPerInstance; j++) {
        const idx = i * pointCountPerInstance + j;
        if (idx < allColors.length) {
          allColors[idx] = idColors[i];
        }
      }
    }
    hitmapProp.colors = allColors;
    if (filteredIndices.length) {
      hitmapProp.points = hitmapProp.points.filter(
        (_, index) => !filteredIndices.includes(Math.floor(index / pointCountPerInstance))
      );
      hitmapProp.colors = hitmapProp.colors.filter(
        (_, index) => !filteredIndices.includes(Math.floor(index / pointCountPerInstance))
      );
    }
  } else {
    hitmapProp.color = startColor;
    if (filteredIndices.length) {
      return null;
    }
  }
  return hitmapProp;
}

export const createInstancedGetHitmap = (pointCountPerInstance: number) => <T: any>(
  props: T,
  assignNextIds: AssignNextIdsFn,
  seenObjects: MouseEventObject[]
): ?T => {
  if (Array.isArray(props)) {
    return props
      .map((prop) => instancedGetHitmapFromSingleProp(prop, assignNextIds, seenObjects, pointCountPerInstance))
      .filter(Boolean);
  }
  return instancedGetHitmapFromSingleProp(props, assignNextIds, seenObjects, pointCountPerInstance);
};
