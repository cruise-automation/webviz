import { RGBA, Point, Transform } from "./types";
import { rotate } from "./vectors";

export function norm({ x, y, z }: Point) {
  return Math.sqrt(x * x + y * y + z * z);
}

export function setRayDistance(pt: Point, distance: number) {
  const { x, y, z } = pt;
  const scale = distance / norm(pt);
  return {
    x: x * scale,
    y: y * scale,
    z: z * scale,
  };
}

export function convertToRangeView(points: Point[], range: number, makeColors: boolean) {
  let colors: RGBA[] = makeColors ? new Array(points.length) : [];
  // First pass to get min and max ranges
  // TODO: Could be more efficient and extract this during
  // transforms for free
  let maxRange = Number.MIN_VALUE;
  if (makeColors) {
    for (let i = 0; i < points.length; ++i) {
      maxRange = Math.max(maxRange, norm(points[i]));
    }
  }
  // actually move the points and generate colors if specified
  for (let i = 0; i < points.length; ++i) {
    const pt = points[i];
    if (makeColors) {
      const dist = norm(pt);
      if (dist <= range) {
        // don't go all the way to white
        const extent = 0.8;
        // closest to target range is lightest,
        // closest to AV is darkest
        const other = (extent * dist) / range;
        colors[i] = { r: 1, g: other, b: other, a: 1 };
      } else {
        // don't go all the way to white
        const extent = 0.8;
        // closest to target range is lightest,
        // closest to max range is darkest
        const upper = maxRange - range;
        const other = extent * (1.0 - dist / upper);
        colors[i] = { r: other, g: other, b: 1, a: 1 };
      }
    }
    points[i] = setRayDistance(pt, range);
  }
  return colors;
}

/*
 * Only returns point clouds that differ. `cloud1` is colored in blue, and
 * `cloud2` is colored in red.
 */
export function diffPoints(
  cloud1: Point[],
  cloud2: Point[]
): {
  points: Point[];
  colors: RGBA[];
} {
  // TODO: This hash can have collisions, need a better one
  const hash = (p: Point) => p.x + p.y + p.z;

  const colorOnlyCloud1 = {
    r: 0,
    g: 0,
    b: 1,
    a: 1,
  };
  const colorOnlyCloud2 = {
    r: 1,
    g: 0,
    b: 0,
    a: 1,
  };

  const points: Point[] = [];
  const colors: RGBA[] = [];

  const map = new Map();
  for (let i = 0; i < cloud1.length; ++i) {
    const h = hash(cloud1[i]);
    map.set(h, cloud1[i]);
  }

  for (let i = 0; i < cloud2.length; ++i) {
    const h = hash(cloud2[i]);
    if (map.has(h)) {
      map.delete(h);
    } else {
      // Point in Cloud2, not Cloud1
      points.push(cloud2[i]);
      colors.push(colorOnlyCloud2);
    }
  }

  // All remaining points in map are points
  // that are in Cloud1, not Cloud2
  map.forEach((val) => {
    points.push(val);
    colors.push(colorOnlyCloud1);
  });

  return { points: points, colors: colors };
}

export function transformPoint(transform: Transform, point: Point) {
  const translation = transform.transform.translation;
  const rotation = transform.transform.rotation;
  let pt = { ...point };
  pt.x -= translation.x;
  pt.y -= translation.y;
  pt.z -= translation.z;
  pt = rotate(rotation, pt);
  return pt;
}

export function transformPoints(transform: Transform, points: Point[]): Point[] {
  return points.map((point) => transformPoint(transform, point));
}
