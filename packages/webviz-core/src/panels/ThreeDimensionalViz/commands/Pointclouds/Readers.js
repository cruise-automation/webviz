// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

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
export class Int16Reader implements FieldReader {
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
    return this.view.getInt16(0, true);
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
