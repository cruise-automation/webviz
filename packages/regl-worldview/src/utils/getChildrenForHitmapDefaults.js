// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { AssignNextIdsFn, MouseEventObject } from "../types";
import { intToRGB } from "./commandUtils";

function nonInstancedGetChildrenForHitmapFromSingleProp<T: any>(
  prop: T,
  assignNextIds: AssignNextIdsFn,
  excludedObjects: MouseEventObject[]
): ?T {
  if (excludedObjects.some(({ object }) => object === prop)) {
    return null;
  }
  const hitmapProp = { ...prop };
  const [id] = assignNextIds({ type: "single", object: prop });
  const hitmapColor = intToRGB(id);
  hitmapProp.color = hitmapColor;
  if (hitmapProp.points && hitmapProp.points.length) {
    hitmapProp.colors = new Array(hitmapProp.points.length).fill(hitmapColor);
  }
  return hitmapProp;
}

export const nonInstancedGetChildrenForHitmap = <T: any>(
  props: T,
  assignNextIds: AssignNextIdsFn,
  excludedObjects: MouseEventObject[]
): ?T => {
  if (Array.isArray(props)) {
    return props
      .map((prop) => nonInstancedGetChildrenForHitmapFromSingleProp(prop, assignNextIds, excludedObjects))
      .filter(Boolean);
  }
  return nonInstancedGetChildrenForHitmapFromSingleProp(props, assignNextIds, excludedObjects);
};

function instancedGetChildrenForHitmapFromSingleProp<T: any>(
  prop: T,
  assignNextIds: AssignNextIdsFn,
  excludedObjects: MouseEventObject[],
  pointCountPerInstance
): ?T {
  const filteredIndices = excludedObjects
    .map(({ object, instanceIndex }) => (object === prop ? instanceIndex : null))
    .filter((instanceIndex) => typeof instanceIndex === "number");
  const hitmapProp = { ...prop };
  const instanceCount = (hitmapProp.points && Math.ceil(hitmapProp.points.length / pointCountPerInstance)) || 1;
  const newIds = assignNextIds({ type: "instanced", count: instanceCount, object: prop });
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

export const createInstancedGetChildrenForHitmap = (pointCountPerInstance: number) => <T: any>(
  props: T,
  assignNextIds: AssignNextIdsFn,
  excludedObjects: MouseEventObject[]
): ?T => {
  if (Array.isArray(props)) {
    return props
      .map((prop) =>
        instancedGetChildrenForHitmapFromSingleProp(prop, assignNextIds, excludedObjects, pointCountPerInstance)
      )
      .filter(Boolean);
  }
  return instancedGetChildrenForHitmapFromSingleProp(props, assignNextIds, excludedObjects, pointCountPerInstance);
};
