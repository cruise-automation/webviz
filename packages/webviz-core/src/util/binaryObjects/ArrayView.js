// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

type GetArrayElement<T> = (offset: number) => T;

export type ArrayView<T> = $ReadOnly<{
  get: (index: number) => T,
  length: () => number,
  iter: () => Iterable<T>,
}>;

// Class is inside a closure to make instance construction cheaper (only two fields to set). The
// getElement and elementSize fields are common to many instances.
const getArrayView = <T>(getElement: GetArrayElement<T>, elementSize: number) =>
  class {
    _begin: number;
    _end: number;
    constructor(begin: number, end: number) {
      this._begin = begin;
      this._end = end;
    }

    // Unfortunately we can't override the [] operator without a proxy, which is very slow.
    get(index: number): T {
      return getElement(this._begin + index * elementSize);
    }

    length(): number {
      return (this._end - this._begin) / elementSize;
    }

    *iter(): Iterable<T> {
      for (let i = this._begin; i < this._end; i += elementSize) {
        yield getElement(i);
      }
    }
  };

export default getArrayView;
