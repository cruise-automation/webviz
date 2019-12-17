// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { type DB } from "idb";
import { Writable } from "stream";

import type { WritableStreamOptions } from "./types";

const DEFAULT_BATCH_SIZE = 5000;

type WriteCallback = (err?: Error) => void;

// a node.js writable stream interface for writing records to indexeddb in batch
// this isn't meant to be created alone, but rather via database.createWriteStream()
export default class DbWriter extends Writable {
  db: DB;
  objectStore: string;
  batch: any[];
  options: WritableStreamOptions;
  total: number = 0;

  constructor(db: DB, objectStore: string, options: WritableStreamOptions) {
    super({ objectMode: true });
    this.db = db;
    this.objectStore = objectStore;
    this.options = options;
    this.batch = [];
  }

  // write a batch of records - in my experimenting its much faster than doing transactional write per item
  writeBatch(callback: WriteCallback): void {
    const batch = this.batch;
    // reset the instance batch
    this.batch = [];
    const tx = this.db.transaction(this.objectStore, "readwrite");
    const store = tx.objectStore(this.objectStore);
    for (const item of batch) {
      const toInsert = this.options.extra ? { ...item, ...this.options.extra } : item;
      store.put(toInsert);
    }
    // use setTimeout to yield the thread a bit - even with their quasi-asyncness
    // node streams can sometimes cause a bit too much throughput pressure on writes
    tx.complete.then(() => setTimeout(callback, 1)).catch(callback);
  }

  // node.js stream api implementation
  _write(chunk: any, encoding: string, callback: WriteCallback) {
    this.batch.push(chunk);
    this.total++;
    if (this.batch.length < (this.options.batchSize || DEFAULT_BATCH_SIZE)) {
      // can handle more data immediately
      callback();
      return;
    }
    // cannot handle more data until transaction completes
    this.writeBatch(callback);
  }

  // node.js stream api implementation
  _final(callback: WriteCallback) {
    this.writeBatch(callback);
  }
}
