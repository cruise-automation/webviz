// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

export interface BackingStore {
  getItem(key: string): ?string;
  setItem(key: string, value: string): void;
  clear(): void;
  removeItem(key: string): void;
}

export type BustStorageFn = (backingStore: BackingStore, keys: string[]) => void;

// Having a global map so that different storage instances can add bust storage function to the same map.
const bustStorageFnsMap = new Map();

// Exported for testing.
export function clearBustStorageFnsMap() {
  bustStorageFnsMap.clear();
}

// Small wrapper around localStorage for convenience.
export default class Storage {
  _backingStore: BackingStore;

  constructor(backingStore: BackingStore = window.localStorage) {
    this._backingStore = backingStore;
  }

  // The registered bustStorageFn will be called when the storage quota is reached.
  registerBustStorageFn(bustStorageFn: BustStorageFn) {
    const bustStorageFns = bustStorageFnsMap.get(this._backingStore) || [];
    bustStorageFnsMap.set(this._backingStore, [...bustStorageFns, bustStorageFn]);
  }

  clear() {
    this._backingStore.clear();
  }

  keys(): string[] {
    // Filter out internal keys for MemoryStorage instances.
    return Object.keys(this._backingStore).filter((key) => !key.startsWith("_internal_"));
  }

  getItem<T>(key: string): T | void {
    const val = this._backingStore.getItem(key);

    // if a non-json value gets into local storage we should ignore it
    try {
      return val ? (JSON.parse(val): T) : undefined;
    } catch (e) {
      // suppress logging during tests - otherwise it prints out a stack trace
      // which makes it look like a test is failing
      if (process.env.NODE_ENV !== "test") {
        console.error("Unable to retrieve key", key, "from storage", e);
      }
      return undefined;
    }
  }

  _bustStorage() {
    const bustStorageFns = bustStorageFnsMap.get(this._backingStore) || [];
    for (const bustStorageFn of bustStorageFns) {
      bustStorageFn(this._backingStore, this.keys());
    }
  }

  setItem(key: string, value: any, bustStorageFn?: BustStorageFn) {
    const strValue = JSON.stringify(value);
    try {
      this._backingStore.setItem(key, strValue);
    } catch {
      // If there is a bustStorageFn when setItem, we should call it first to bust the lower priority caches.
      if (bustStorageFn) {
        bustStorageFn(this._backingStore, this.keys());
      } else {
        this._bustStorage();
      }
      let err;
      try {
        this._backingStore.setItem(key, strValue);
      } catch (e) {
        err = e;
        if (bustStorageFn) {
          // Call the globally cache busting functions to bust more cache if setItem still fails.
          this._bustStorage();
          try {
            // Try writing again.
            this._backingStore.setItem(key, strValue);
          } catch (e1) {
            err = e1;
          }
        }
        if (err) {
          throw err;
        }
      }
    }
  }

  removeItem(key: string) {
    this._backingStore.removeItem(key);
  }
}
