// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import tinycolor from "tinycolor2";

import type { OccupancyGridMessage } from "webviz-core/src/types/Messages";

export function setRgba(buffer: Uint8Array, index: number, color: tinycolor) {
  const rgba255 = color.toRgb();
  rgba255.a *= 255;
  buffer[index] = rgba255.r;
  buffer[index + 1] = rgba255.g;
  buffer[index + 2] = rgba255.b;
  buffer[index + 3] = rgba255.a;
}

export const defaultMapPalette = (() => {
  const buff = new Uint8Array(256 * 4);

  // standard gray map palette values
  for (let i = 0; i <= 100; i++) {
    const t = 1 - i / 100;
    const idx = i * 4;
    setRgba(buff, idx, tinycolor.fromRatio({ r: t, g: t, b: t }));
  }

  // illegal positive values in green
  for (let i = 101; i <= 127; i++) {
    const idx = i * 4;
    setRgba(buff, idx, tinycolor("lime"));
  }

  // illegal negative (char) values
  for (let i = 128; i <= 254; i++) {
    const idx = i * 4;
    const t = (i - 128) / (254 - 128);
    setRgba(buff, idx, tinycolor.fromRatio({ r: t, g: 0.2, b: 0.6, a: Math.max(1 - t, 0.2) }));
  }

  // legal -1 value
  setRgba(buff, 255 * 4, tinycolor("#99d6b1").setAlpha(0.25));
  return buff;
})();

// convert a number array to a typed array
// passing a typed array to regl is orders of magnitude
// faster than passing a number[] and letting regl do the conversion
function toTypedArray(data: number[] | Int8Array): Uint8Array {
  if (data instanceof Int8Array) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  const result = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    result[i] = data[i];
  }
  return result;
}

class TextureCacheEntry {
  marker: OccupancyGridMessage;
  texture: any;
  // regl context
  regl: any;

  constructor(regl, marker) {
    this.marker = marker;
    this.regl = regl;
    const { info, data } = marker;

    this.texture = regl.texture({
      format: "alpha",
      mipmap: false,
      data: toTypedArray(data),
      width: info.width,
      height: info.height,
    });
  }

  // get the texture for a marker
  // if the marker is not the same reference
  // generate a new texture, otherwise keep the old one
  // uploading new texture data to the gpu is something
  // you only want to do when required - it takes several milliseconds
  getTexture(marker) {
    if (this.marker === marker) {
      return this.texture;
    }
    this.marker = marker;
    const { info, data } = marker;
    this.texture = this.texture({
      format: "alpha",
      mipmap: false,
      data: toTypedArray(data),
      width: info.width,
      height: info.height,
    });
    return this.texture;
  }
}

export class TextureCache {
  store: { [string]: TextureCacheEntry } = {};
  // regl context
  regl: any;

  constructor(regl: any) {
    this.regl = regl;
  }

  // returns a regl texture for a given marker
  get(marker: OccupancyGridMessage) {
    const { name } = marker;
    const item = this.store[name];
    if (!item) {
      // if the item is missing initialize a new entry
      const entry = new TextureCacheEntry(this.regl, marker);
      this.store[name] = entry;
      return entry.texture;
    }
    return item.getTexture(marker);
  }
}
