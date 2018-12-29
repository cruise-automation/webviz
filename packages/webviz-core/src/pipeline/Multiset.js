// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { isEqual, flatten } from "lodash";

// Store a set of values allowing repetitions. A custom comparison function is used
// to determine key equality, but values are compared using deep object equality.
export default class Multiset<T> {
  _itemSets: T[][] = [];
  _keyEqual: (T, T) => boolean;

  constructor(keyEqual: (T, T) => boolean) {
    this._keyEqual = keyEqual;
  }

  allItems(): T[] {
    return flatten(this._itemSets);
  }

  uniqueItems(): T[] {
    return this._itemSets.map((items) => items[0]);
  }

  // Add an item to the set. Returns true if the item is new, false if equivalent items already existed.
  add(newItem: T): boolean {
    for (const itemSet of this._itemSets) {
      if (this._keyEqual(itemSet[0], newItem)) {
        itemSet.push(newItem);
        return false;
      }
    }
    this._itemSets.push([newItem]);
    return true;
  }

  // Remove an item. Return true if it was the last equivalent item removed, false if some remain.
  remove(itemToRemove: T): boolean {
    for (let i = 0; i < this._itemSets.length; i++) {
      const itemSet = this._itemSets[i];
      if (!this._keyEqual(itemSet[0], itemToRemove)) {
        continue;
      }
      for (let j = 0; j < itemSet.length; j++) {
        if (isEqual(itemSet[j], itemToRemove)) {
          if (itemSet.length === 1) {
            // last item from this set is being removed -- delete the whole itemSet
            this._itemSets.splice(i, 1);
            return true;
          }
          itemSet.splice(j, 1);
          return false;
        }
      }
    }
    return false;
  }

  clear() {
    this._itemSets = [];
  }
}
