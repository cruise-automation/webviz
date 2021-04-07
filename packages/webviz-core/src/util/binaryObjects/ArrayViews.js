// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { find } from "lodash";

import { deepParse, isBobject } from "webviz-core/src/util/binaryObjects";
import { deepParseSymbol } from "webviz-core/src/util/binaryObjects/messageDefinitionUtils";

type GetArrayElement<T> = (offset: number) => T;

export interface ArrayView<T> {
  +get: (index: number, bigInt: ?true) => T;
  +length: () => number;
  +toArray: () => T[];
  +find: (predicate: (item: T, index: number, collection: T[]) => boolean) => ?T;
  @@iterator(): Iterator<T>;
}

// Class is inside a closure to make instance construction cheaper (only two fields to set). The
// getElement and elementSize fields are common to many instances.
export const getArrayView = <T>(
  getElement: GetArrayElement<T>,
  elementSize: number,
  getBigIntElement: ?GetArrayElement<T>
) =>
  class BinaryArrayView implements ArrayView<T> {
    _begin: number;
    _length: number;
    constructor(begin: number, length: number) {
      this._begin = begin;
      this._length = length;
    }

    // Unfortunately we can't override the [] operator without a proxy, which is very slow.
    get(index: number, bigInt: ?true): T {
      if (bigInt && getBigIntElement) {
        return getBigIntElement(this._begin + index * elementSize);
      }
      return getElement(this._begin + index * elementSize);
    }

    length(): number {
      return this._length;
    }

    // https://stackoverflow.com/questions/48491307/iterable-class-in-flow
    /*::
    @@iterator(): Iterator<T> {
      // $FlowFixMe
      return this[Symbol.iterator]()
    }
    */
    // $FlowFixMe
    *[Symbol.iterator](): Iterable<T> {
      let offset = this._begin;
      const length = this._length;
      for (let i = 0; i < length; i += 1) {
        yield getElement(offset);
        offset += elementSize;
      }
    }

    // $FlowFixMe
    [deepParseSymbol](): T[] {
      const ret = new Array(this._length);
      let offset = this._begin;
      const length = this._length;
      for (let i = 0; i < length; i += 1) {
        const o = getElement(offset);
        ret[i] = isBobject(o) ? deepParse(o) : o;
        offset += elementSize;
      }
      return ret;
    }

    // Shallow parse. Equivalent to [...this], but faster. Used in deep parsing for primitive
    // types, so quite performance-sensitive.
    toArray(): T[] {
      const ret = new Array(this.length());
      let offset = this._begin;
      const length = this._length;
      for (let i = 0; i < length; i += 1) {
        ret[i] = getElement(offset);
        offset += elementSize;
      }
      return ret;
    }

    find(predicate: (item: T, index: number, collection: T[]) => boolean): ?T {
      return find(this.toArray(), predicate);
    }

    offset(): number {
      // It would be nice to just define an [offsetSymbol] attribute, but flow really dislikes it.
      return this._begin;
    }
  };

export class PrimitiveArrayView<T> implements ArrayView<T> {
  value: T[];
  constructor(value: T[]) {
    this.value = value;
  }
  get(index: number): T {
    return this.value[index];
  }
  length() {
    return this.value.length;
  }
  // https://stackoverflow.com/questions/48491307/iterable-class-in-flow
  /*::
  @@iterator(): Iterator<T> {
    // $FlowFixMe
    return this[Symbol.iterator]()
  }
  */
  // $FlowFixMe
  *[Symbol.iterator](): Iterable<T> {
    for (const o of this.value) {
      yield o;
    }
  }
  // Use deepParse(arr)
  // $FlowFixMe
  [deepParseSymbol](): T[] {
    return this.value;
  }
  toArray(): T[] {
    return this.value;
  }

  find(predicate: (item: T, index: number, collection: T[]) => boolean): ?T {
    return find(this.toArray(), predicate);
  }
}

export const getReverseWrapperArrayView = <T>(Class: any) =>
  class ReverseWrapperArrayView implements ArrayView<T> {
    value: T[];
    constructor(value: T[]) {
      this.value = value;
    }
    get(index: number): T {
      return new Class(this.value[index]);
    }
    length(): number {
      return this.value.length;
    }
    // https://stackoverflow.com/questions/48491307/iterable-class-in-flow
    /*::
    @@iterator(): Iterator<T> {
      // $FlowFixMe
      return this[Symbol.iterator]()
    }
    */
    // $FlowFixMe
    *[Symbol.iterator](): Iterable<T> {
      for (const o of this.value) {
        yield isBobject(o) ? o : new Class(o);
      }
    }
    // Use deepParse(arr)
    // $FlowFixMe
    [deepParseSymbol](): T[] {
      return this.value.map((o) => (isBobject(o) ? deepParse(o) : deepParse(new Class(o))));
    }
    toArray(): T[] {
      const ret = [];
      let i = 0;
      for (const o of this) {
        ret[i] = o;
        i += 1;
      }
      return ret;
    }

    find(predicate: (item: T, index: number, collection: T[]) => boolean): ?T {
      return find(this.toArray(), predicate);
    }
  };
