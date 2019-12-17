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
  removeItem(key: string): void;
}

// small wrapper around localstorage for convenience
export default class Storage {
  backingStore: BackingStore;
  constructor(backingStore: BackingStore = window.localStorage) {
    this.backingStore = backingStore;
  }

  get<T>(key: string): T | void {
    const val = this.backingStore.getItem(key);
    // if a non-json value gets into local storage we should ignore it
    try {
      return val ? (JSON.parse(val): T) : undefined;
    } catch (e) {
      // suppress logging during tests - otherwise it prints out a stack trace
      // which makes it look like a test is failing
      if (process.env.NODE_ENV !== "test") {
        console.error("Unable to retreive key", key, "from storage", e);
      }
      return undefined;
    }
  }

  set(key: string, value: any) {
    this.backingStore.setItem(key, JSON.stringify(value));
  }

  remove(key: string) {
    this.backingStore.removeItem(key);
  }
}
