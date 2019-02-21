// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { type HitmapProp, type MarkerDefault, type HitmapMarkerDefault } from "../commands/Command";
import { getIdFromColor, intToRGB } from "./commandUtils";

export function getHitmapId<T>(marker: MarkerDefault<T>, pointIndex: ?number = 0) {
  return ((marker && marker.id) || 0) + pointIndex;
}

//
// ─── default props for Cubes, Points, Cones, and Cylinders ──────────────────────────────────────────────────────
//
// generate default hitmapProps
export function getHitmapProps<T: MarkerDefault>(children: T[], enableInstanceHitmap: boolean): ?(HitmapProp<T>[]) {
  if (!children || children.length === 0) {
    return undefined;
  }

  return children.reduce((memo, marker) => {
    if (enableInstanceHitmap && marker.points) {
      memo.push({
        ...marker,
        colors: marker.points.map((_, pointIndex) => intToRGB(getHitmapId(marker, pointIndex) || 0)),
      });
    } else if (marker.color && marker.id) {
      const hitmapId = getHitmapId(marker);
      // filter out components that don't have hitmapIds
      if (hitmapId != null) {
        memo.push({
          ...marker,
          color: intToRGB(hitmapId),
        });
      }
    }
    return memo;
  }, []);
}

// find the the object that matches the hitmapId/objectId
export function getObjectFromHitmapId<HitmapProp: HitmapMarkerDefault>(
  objectId: number,
  hitmapProps: HitmapProp[],
  enableInstanceHitmap: boolean
) {
  return hitmapProps.find((hitmapProp) => {
    if (hitmapProp.points && enableInstanceHitmap && hitmapProp.id) {
      // for instanced rendering, find the hitmapProp that produces the same id range and return it
      if (objectId >= hitmapProp.id && objectId < hitmapProp.id + hitmapProp.points.length) {
        return true;
      }
    } else if (hitmapProp.color) {
      const hitmapPropId = getIdFromColor(hitmapProp.color.map((color) => color * 255));
      if (hitmapPropId === objectId) {
        return true;
      }
    }
    return false;
  });
}

//
// ─── Points and Triangles (separate triangles props into their own if needed) ─────────────────────────────────
//
export function getHitmapPropsForPoints<T: MarkerDefault>(children: T[]): ?(HitmapProp<T>[]) {
  if (!children || children.length === 0) {
    return undefined;
  }

  return children.reduce((memo, marker) => {
    if (marker.points) {
      memo.push({
        ...marker,
        colors: marker.points.map((_, pointIndex) => intToRGB(getHitmapId(marker, pointIndex) || 0)),
      });
    }
    return memo;
  }, []);
}

export function getObjectFromHitmapIdForPoints<HitmapProp: HitmapMarkerDefault>(
  objectId: number,
  hitmapProps: HitmapProp[]
): ?HitmapProp {
  return hitmapProps.find((hitmapProp) => {
    if (hitmapProp.points && hitmapProp.id) {
      // for instanced rendering, find the hitmapProp that produces the same id range and return it
      if (objectId >= hitmapProp.id && objectId < hitmapProp.id + hitmapProp.points.length) {
        return true;
      }
    }
    return false;
  });
}
