export declare type RGBA = {
  // all values are scaled between 0-1 instead of 0-255
  r: number;
  g: number;
  b: number;
  a: number; // opacity -- typically you should set this to 1.
};

export declare type Point = {
  x: number;
  y: number;
  z: number;
};

export interface FieldReader {
  read(data: number[], index: number): number;
}

export class Float32Reader implements FieldReader {
  offset: number;
  view: DataView;
  constructor(offset: number) {
    this.offset = offset;
    const buffer = new ArrayBuffer(4);
    this.view = new DataView(buffer);
  }

  read(data: number[], index: number): number {
    this.view.setUint8(0, data[index + this.offset]);
    this.view.setUint8(1, data[index + this.offset + 1]);
    this.view.setUint8(2, data[index + this.offset + 2]);
    this.view.setUint8(3, data[index + this.offset + 3]);
    return this.view.getFloat32(0, true);
  }
}

export class Int32Reader implements FieldReader {
  offset: number;
  view: DataView;
  constructor(offset: number) {
    this.offset = offset;
    const buffer = new ArrayBuffer(4);
    this.view = new DataView(buffer);
  }

  read(data: number[], index: number): number {
    this.view.setUint8(0, data[index + this.offset]);
    this.view.setUint8(1, data[index + this.offset + 1]);
    this.view.setUint8(2, data[index + this.offset + 2]);
    this.view.setUint8(3, data[index + this.offset + 3]);
    return this.view.getInt32(0, true);
  }
}

export class Uint16Reader implements FieldReader {
  offset: number;
  view: DataView;
  constructor(offset: number) {
    this.offset = offset;
    const buffer = new ArrayBuffer(2);
    this.view = new DataView(buffer);
  }

  read(data: number[], index: number): number {
    this.view.setUint8(0, data[index + this.offset]);
    this.view.setUint8(1, data[index + this.offset + 1]);
    return this.view.getUint16(0, true);
  }
}

export class Uint8Reader implements FieldReader {
  offset: number;
  constructor(offset: number) {
    this.offset = offset;
  }

  read(data: number[], index: number): number {
    return data[index + this.offset];
  }
}

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
  let i;
  // First pass to get min and max ranges
  // TODO: Could be more efficient and extract this during
  // transforms for free
  const minRange = 0;
  let maxRange = Number.MIN_VALUE;
  if (makeColors) {
    for (i = 0; i < points.length; ++i) {
      maxRange = Math.max(maxRange, norm(points[i]));
    }
  }
  // actually move the points and generate colors if specified
  for (i = 0; i < points.length; ++i) {
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
        const depth = dist - range;
        const other = extent * (1.0 - dist / upper);
        colors[i] = { r: other, g: other, b: 1, a: 1 };
      }
    }
    points[i] = setRayDistance(pt, range);
  }
  return colors;
}
