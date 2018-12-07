//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

export const p = (x, y = x, z = x) => ({ x, y, z });
export const q = (x, y = x, z = x, w = x) => ({ x, y, z, w });

export const buildMatrix = (x, y, z, step = 1) => {
  const result = [];
  for (let i = 0; i < x; i++) {
    for (let j = 0; j < y; j++) {
      for (let k = 0; k < z; k++) {
        result.push(p(i * step, j * step, k * step));
      }
    }
  }
  return result;
};

export const buildSphereList = (range) => {
  const coords = buildMatrix(20, 20, 20, 10);
  const marker = {
    points: coords,
    scale: p(0.25 * (1 + range)),
    color: { r: 1, g: range, b: 1, a: 1 },
    pose: {
      position: p(3 + range),
      orientation: q(0),
    },
  };
  return marker;
};

const DEFAULT_MARKER_COUNT = 20;
const CUBE_GAP = 5;

export function numberToColor(number: number, max: number, a: number = 1): RGBA {
  const i = (number * 255) / max;
  const r = Math.round(Math.sin(0.024 * i + 0) * 127 + 128) / 255;
  const g = Math.round(Math.sin(0.024 * i + 2) * 127 + 128) / 255;
  const b = Math.round(Math.sin(0.024 * i + 4) * 127 + 128) / 255;
  return { r, g, b, a };
}

export function lerp(start, end, amt) {
  return (1 - amt) * start + amt * end;
}

export function generateCubes(clickedIds, count = DEFAULT_MARKER_COUNT, hitmapIdStartIdx = 1): Cube[] {
  const totalLen = count * CUBE_GAP;
  return new Array(count).fill(0).map((_, idx) => {
    const posX = -totalLen / 2 + idx * CUBE_GAP;
    const posY = Math.sin(posX) * 30;
    const posZ = Math.cos(posX) * 20;
    const hitmapId = idx + hitmapIdStartIdx;
    const isClicked = clickedIds.has(hitmapId);
    const scale = isClicked ? p(10, 10) : p(5, 5);
    const alpha = isClicked ? 1 : 0.2 + idx / count;
    return {
      hitmapId,
      pose: {
        orientation: { x: 0.038269, y: -0.01677, z: -0.8394, w: 0.541905 },
        position: { x: posX, y: posY, z: posZ },
      },
      scale,
      color: numberToColor(idx, count, alpha),
      info: {
        description: 'additional cube info',
        objectId: hitmapId + 10000,
      },
    };
  });
}

export function generateSpheres(clickedIds, count = DEFAULT_MARKER_COUNT, hitmapIdStartIdx = 1): SphereList[] {
  const totalLen = count * CUBE_GAP * 1.1;
  return new Array(count).fill(0).map((_, idx) => {
    const posX = -totalLen / 2 + idx * CUBE_GAP * 1.1;
    const posY = -Math.sin(posX) * 30;
    const posZ = -Math.cos(posX) * 20;

    const hitmapId = idx + hitmapIdStartIdx;
    const isClicked = clickedIds.has(hitmapId);
    const scale = isClicked ? p(10, 10) : p(5, 5);
    const alpha = isClicked ? 1 : 0.2 + idx / count;
    return {
      hitmapId,
      pose: {
        orientation: { x: 0.038269, y: -0.01677, z: -0.8394, w: 0.541905 },
        position: { x: posY, y: posX, z: posZ },
      },
      scale,
      color: numberToColor(count - idx - 1, count, alpha),
      info: {
        description: 'additional sphere info',
        objectId: hitmapId + 1000,
      },
    };
  });
}
