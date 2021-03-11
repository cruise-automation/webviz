// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

export default class BobWriter {
  _strings: string[]; // Un-joined bigString
  _bytesUsed: number;
  _stringStartCache: { [s: string]: number };
  _totalStringLength: number;

  // Not updated on reset:
  _storage: Uint8Array = new Uint8Array(100 * 1000);
  _view: DataView = new DataView(this._storage.buffer);

  constructor() {
    this.reset();
  }

  write() {
    const ret = { buffer: this._storage.buffer.slice(0, this._bytesUsed), bigString: this._strings.join("") };
    this.reset();
    return ret;
  }

  reset() {
    this._strings = [];
    this._bytesUsed = 0;
    this._stringStartCache = {};
    this._totalStringLength = 0;
  }

  alloc(bytes: number): { offset: number, view: DataView } {
    if (this._bytesUsed + bytes > this._storage.length) {
      const newStorage = new Uint8Array(this._storage.length * 2);
      newStorage.set(this._storage);
      this._storage = newStorage;
      this._view = new DataView(this._storage.buffer);
    }
    const offset = this._bytesUsed;
    this._bytesUsed += bytes;
    return { offset, view: this._view };
  }

  string(s: string): number {
    const cachedValue = this._stringStartCache[s];
    if (cachedValue != null) {
      return cachedValue;
    }
    const start = this._totalStringLength;
    this._totalStringLength += s.length;
    this._strings.push(s);
    this._stringStartCache[s] = start;
    return start;
  }
}
