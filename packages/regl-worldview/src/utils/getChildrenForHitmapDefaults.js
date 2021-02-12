// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { AssignNextColorsFn, MouseEventObject } from "../types";

function nonInstancedGetChildrenForHitmapFromSingleProp<T: any>(
  prop: T,
  assignNextColors: AssignNextColorsFn,
  excludedObjects: MouseEventObject[],
  useOriginalMarkerProp: boolean = false
): ?T {
  // The marker that we send to event callbacks.
  const eventCallbackMarker = useOriginalMarkerProp ? prop.originalMarker : prop;
  if (excludedObjects.some(({ object }) => object === eventCallbackMarker)) {
    return null;
  }
  const hitmapProp = { ...prop };
  const [hitmapColor] = assignNextColors(eventCallbackMarker, 1);
  hitmapProp.color = hitmapColor;
  if (hitmapProp.colors && hitmapProp.points && hitmapProp.points.length) {
    hitmapProp.colors = new Array(hitmapProp.points.length).fill(hitmapColor);
  }
  return hitmapProp;
}

export const nonInstancedGetChildrenForHitmap = <T: any>(
  props: T,
  assignNextColors: AssignNextColorsFn,
  excludedObjects: MouseEventObject[]
): ?T => {
  if (Array.isArray(props)) {
    return props
      .map((prop) => nonInstancedGetChildrenForHitmapFromSingleProp(prop, assignNextColors, excludedObjects))
      .filter(Boolean);
  }
  return nonInstancedGetChildrenForHitmapFromSingleProp(props, assignNextColors, excludedObjects);
};

// Almost identical to nonInstancedGetChildrenForHitmap, but instead the object passed to event callbacks is the object
// at `prop.originalMarker`, not just `prop`.
export const getChildrenForHitmapWithOriginalMarker = <T: any>(
  props: T,
  assignNextColors: AssignNextColorsFn,
  excludedObjects: MouseEventObject[]
) => {
  if (Array.isArray(props)) {
    return props
      .map((prop) => nonInstancedGetChildrenForHitmapFromSingleProp(prop, assignNextColors, excludedObjects, true))
      .filter(Boolean);
  }
  return nonInstancedGetChildrenForHitmapFromSingleProp(props, assignNextColors, excludedObjects, true);
};

function instancedGetChildrenForHitmapFromSingleProp<T: any>(
  prop: T,
  assignNextColors: AssignNextColorsFn,
  excludedObjects: MouseEventObject[],
  pointCountPerInstance
): ?T {
  const matchedExcludedObjects = excludedObjects.filter(({ object, instanceIndex }) => object === prop);
  const filteredIndices = matchedExcludedObjects
    .map(({ object, instanceIndex }) => instanceIndex)
    .filter((instanceIndex) => typeof instanceIndex === "number");
  const hitmapProp = { ...prop };
  const instanceCount = (hitmapProp.points && Math.ceil(hitmapProp.points.length / pointCountPerInstance)) || 1;
  // This returns 1 color per instance.
  const idColors = assignNextColors(prop, instanceCount);
  const startColor = idColors[0];
  // We have to map these instance colors to `pointCountPerInstance` number of points
  if (hitmapProp.points && hitmapProp.points.length) {
    const allColors = new Array(hitmapProp.points.length).fill().map(() => startColor);
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
    } else if (matchedExcludedObjects.length) {
      // if we don't have instance indices, just filter out the whole object.
      return null;
    }
  } else {
    hitmapProp.color = startColor;
    if (matchedExcludedObjects.length) {
      return null;
    }
  }
  return hitmapProp;
}

export const createInstancedGetChildrenForHitmap = (pointCountPerInstance: number) => <T: any>(
  props: T,
  assignNextColors: AssignNextColorsFn,
  excludedObjects: MouseEventObject[]
): ?T => {
  if (Array.isArray(props)) {
    return props
      .map((prop) =>
        instancedGetChildrenForHitmapFromSingleProp(prop, assignNextColors, excludedObjects, pointCountPerInstance)
      )
      .filter(Boolean);
  }
  return instancedGetChildrenForHitmapFromSingleProp(props, assignNextColors, excludedObjects, pointCountPerInstance);
};
