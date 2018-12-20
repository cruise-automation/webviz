// @flow

import seedrandom from "seedrandom";

export const p = (x: number, y: number = x, z: number = x) => ({ x, y, z });
export const q = (x: number, y: number = x, z: number = x, w: number = x) => ({ x, y, z, w });

export const UNIT_QUATERNION = q(0, 0, 0, 1);

export const buildMatrix = (x: number, y: number, z: number, step: number = 1) => {
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

const seed = 123; // fixed seed for screenshot tests.

export const rng = seedrandom(seed);

export const cube = (range: number, id: number = 1) => {
  const marker = {
    id,
    pose: {
      orientation: { x: 0.038269, y: -0.01677, z: -0.8394, w: 0.541905 },
      position: { x: range, y: range, z: range },
    },
    scale: p(5, 5),
    color: { r: 1, g: 0, b: 1, a: 1 },
  };
  return marker;
};
