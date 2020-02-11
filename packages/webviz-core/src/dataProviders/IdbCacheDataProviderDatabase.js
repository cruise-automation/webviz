// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import Database from "webviz-core/src/util/indexeddb/Database";
import { updateMetaDatabases } from "webviz-core/src/util/indexeddb/MetaDatabase";

const MAX_DATABASES = 6;
const DATABASE_NAME_PREFIX = "IdbCacheDataProviderDb-v2-";
const META_DATABASE_NAME = "IdbCacheDataProviderMetaDb";
export const MESSAGES_STORE_NAME = "messages";
export const PRIMARY_KEY = "primaryKey";
export const TIMESTAMP_KEY = "timestampNsSinceStart";
export const TIMESTAMP_INDEX = "timestamp";
export const TOPIC_RANGES_STORE_NAME = "topic_ranges";
export const TOPIC_RANGES_KEY = "topic_ranges";

// We have two stores:
// 1. `MESSAGES_STORE_NAME` which stores the messages, wrapped in an object that
//     has a `TIMESTAMP_KEY` which represents the nanoseconds since the start.
// 2. `TOPIC_RANGES_STORE_NAME` which stores only one object, under the
//    `TOPIC_RANGES_KEY` key, which contains which ranges for which topics have
//    been stored.
export async function getIdbCacheDataProviderDatabase(id: string): Promise<Database> {
  const databaseName = DATABASE_NAME_PREFIX + id;
  await updateMetaDatabases(databaseName, MAX_DATABASES, META_DATABASE_NAME);
  const config = {
    version: 1, // Don't change the version, instead change DATABASE_NAME_PREFIX.
    name: databaseName,
    objectStores: [
      {
        name: MESSAGES_STORE_NAME,
        options: { keyPath: PRIMARY_KEY },
        indexes: [{ name: TIMESTAMP_INDEX, keyPath: TIMESTAMP_KEY }],
      },
      { name: TOPIC_RANGES_STORE_NAME },
    ],
  };
  return Database.get(config);
}
