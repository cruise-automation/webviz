// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { deepParse, isBobject } from "webviz-core/src/util/binaryObjects";
import { deepParseSymbol } from "webviz-core/src/util/binaryObjects/messageDefinitionUtils";

type GetArrayElement<T> = (offset: number) => T;

// Class is inside a closure to make instance construction cheaper (only two fields to set). The
// getElement and elementSize fields are common to many instances.
const getArrayView = <T>(getElement: GetArrayElement<T>, elementSize: number) =>
  class {
    _begin: number;
    _length: number;
    constructor(begin: number, length: number) {
      this._begin = begin;
      this._length = length;
    }

    // Unfortunately we can't override the [] operator without a proxy, which is very slow.
    get(index: number): T {
      return getElement(this._begin + index * elementSize);
    }

    length(): number {
      return this._length;
    }

    // https://stackoverflow.com/questions/48491307/iterable-class-in-flow
    /*::
    @@iterator(): Iterator<string> {
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
  };

export default getArrayView;
