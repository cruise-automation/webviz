// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { HitmapProp, MarkerDefault, HitmapMarkerDefault } from "../commands/Command";
import { getIdFromColor, intToRGB } from "./commandUtils";

export function getHitmapId<T>(marker: MarkerDefault<T>, pointIndex: ?number = 0) {
  return ((marker && marker.id) || 0) + pointIndex;
}

//
// ─── Default props for Cubes, Points, Cones, and Cylinders ──────────────────────────────────────────────────────
//
// generate default hitmapProps
export function getHitmapProps<T: MarkerDefault>(children: T[]): ?(HitmapProp<T>[]) {
  if (!children || children.length === 0) {
    return undefined;
  }

  return children.reduce((memo, marker) => {
    if (marker.points) {
      memo.push({
        ...marker,
        colors: marker.points.map((_, pointIndex) => intToRGB(getHitmapId(marker, pointIndex) || 0)),
      });
    } else {
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
export function getObjectFromHitmapId<HitmapProp: HitmapMarkerDefault>(objectId: number, hitmapProps: HitmapProp[]) {
  return hitmapProps.find((hitmapProp) => {
    if (hitmapProp.points && hitmapProp.id) {
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
// ─── Points, Lines and Triangles (separate triangles props into their own if needed) ─────────────────────────────────
//
export function getHitmapPropsForInstancedCommands<T: MarkerDefault>(children: T[]): ?(HitmapProp<T>[]) {
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

export function getObjectForInstancedCommands<HitmapProp: HitmapMarkerDefault>(
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

//
// ─── Default props for FilledPolygons ──────────────────────────────────────────────────────
//
export function getHitmapPropsForFilledPolygons<T: MarkerDefault>(children: T[]): ?(HitmapProp<T>[]) {
  if (!children || children.length === 0) {
    return undefined;
  }
  return children.map((marker) => ({ ...marker, color: intToRGB(marker.id || 0) }));
}

export function getObjectFromHitmapIdForFilledPolygons<HitmapProp: HitmapMarkerDefault>(
  objectId: number,
  hitmapProps: HitmapProp[]
) {
  return hitmapProps.find((hitmapProp) => {
    if (hitmapProp.color) {
      const hitmapPropId = getIdFromColor(hitmapProp.color.map((color) => color * 255));
      if (hitmapPropId === objectId) {
        return true;
      }
    }
    return false;
  });
}
