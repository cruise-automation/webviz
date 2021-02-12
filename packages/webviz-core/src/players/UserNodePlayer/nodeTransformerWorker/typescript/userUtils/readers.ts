export const DATATYPE = {
  uint8: 2,
  uint16: 4,
  int16: 3,
  int32: 5,
  float32: 7,
};

export interface FieldReader {
  read(data: Uint8Array, index: number): number;
}

export class Float32Reader implements FieldReader {
  offset: number;
  view: DataView;
  constructor(offset: number) {
    this.offset = offset;
    const buffer = new ArrayBuffer(4);
    this.view = new DataView(buffer);
  }

  read(data: Uint8Array, index: number): number {
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

  read(data: Uint8Array, index: number): number {
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

  read(data: Uint8Array, index: number): number {
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

  read(data: Uint8Array, index: number): number {
    return data[index + this.offset];
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

  read(data: Uint8Array, index: number): number {
    this.view.setUint8(0, data[index + this.offset]);
    this.view.setUint8(1, data[index + this.offset + 1]);
    return this.view.getInt16(0, true);
  }
}

export function getReader(datatype: number, offset: number) {
  switch (datatype) {
    case DATATYPE.float32:
      return new Float32Reader(offset);
    case DATATYPE.uint8:
      return new Uint8Reader(offset);
    case DATATYPE.uint16:
      return new Uint16Reader(offset);
    case DATATYPE.int16:
      return new Int16Reader(offset);
    case DATATYPE.int32:
      return new Int32Reader(offset);
    default:
      throw new Error(`Unsupported datatype: '${datatype}'`);
  }
}
