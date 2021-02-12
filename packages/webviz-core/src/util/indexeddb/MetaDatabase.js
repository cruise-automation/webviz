// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import Database from "webviz-core/src/util/indexeddb/Database";
import Logger from "webviz-core/src/util/Logger";

const log = new Logger(__filename);

/*

MetaDatabase

This IndexedDB instance is a hardcoded reference to the dynamically named
databases from different players, such that we can figure out whether we
need to create a new instance or not. In terms of data integrity, things only
get evicted if a global limit, which is correlated with origin of the saved
resource. Attempting to exceed global limit (which is based on available disk
space) does trigger eviction, but does so based on origin, so they won't try to
delete just parts of your data. The other type of limit we could potentially
violate is group limit, but it's just a hard limit based on origin and does not
trigger any eviction.

More info here:
https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Browser_storage_limits_and_eviction_criteria

*/

const metadataObjectStoreName = "databases";
const getConfig = (metadataDatabaseName: string) => ({
  version: 1,
  name: metadataDatabaseName,
  objectStores: [
    {
      name: metadataObjectStoreName,
    },
  ],
});

// Tries to delete an indexeddb database.
// We return true if we were successfully able to delete the database.
// If the database is currently open in another tab it will fire the onblocked callback.
// If multiple tabs all try to delete only the first will raise an onblocked call:
// https://github.com/w3c/IndexedDB/issues/223
// so also use a timeout of 500 milliseconds & continue as if it was blocked.
// Note: since this runs each time we make a new database when user finally closes all opened tabs
// the next creation of a database will clean up all the old ones.
function tryDelete(databaseName: string): Promise<boolean> {
  return new Promise((resolve) => {
    log.info("Trying to delete old database", databaseName);
    let resolved = false;
    const done = (success: boolean) => {
      if (resolved) {
        return;
      }
      resolved = true;
      resolve(success);
    };
    const deleteRequest = global.indexedDB.deleteDatabase(databaseName);
    // if we don't hear anything after 500 milliseconds assume the request is blocked
    setTimeout(() => done(false), 500);
    deleteRequest.onsuccess = () => {
      log.info(`Successfully deleted indexeddb database ${databaseName}.`);
      done(true);
    };
    deleteRequest.onerror = (err) => {
      log.error(`Unable to delete indexeddb database ${databaseName}`, err);
      done(false);
    };
    deleteRequest.onblocked = () => {
      log.info(`Could not delete ${databaseName} - request blocked.  This database is likey open in another tab.`);
      done(false);
    };
  });
}

async function validateStorageQuota(): Promise<void> {
  if (process.env.NODE_ENV === "test") {
    // navigator.storage is not available in tests.
    return;
  }

  // $FlowFixMe - doesn't understand navigator.storage
  if (!navigator || !navigator.storage || !navigator.storage.estimate) {
    throw new Error("navigator.storage.estimate not supported; we only support the latest version of Google Chrome");
  }
  const { quota } = await navigator.storage.estimate();
  if (!quota) {
    throw new Error(
      "navigator.storage.estimate().quota not supported; we only support the latest version of Google Chrome"
    );
  }
  const mbAvailable = Math.round(quota / 1000 / 1000);
  if (mbAvailable < 200) {
    // Incognito mode limits to ~100MB.
    throw new Error(
      `Less than 200MB available in IndexedDB: ${mbAvailable}MB. Are you using Incognito Mode? Unfortunately, we do not support streaming Webviz in Incognito Mode.`
    );
  }
  if (mbAvailable < 2000) {
    // 2GB should be enough in most cases. Good to have a bit of a buffer.
    throw new Error(
      `Less than 2GB available in IndexedDB: ${mbAvailable}MB. Make sure you have plenty of free space on your disk.`
    );
  }
}

export async function updateMetaDatabases(
  newDatabaseName: string,
  maxDatabases: number,
  metadataDatabaseName: string
): Promise<void> {
  log.info("Checking MetaDatabase", {
    name: newDatabaseName,
  });
  await validateStorageQuota();

  const metadataDatabase = await Database.get(getConfig(metadataDatabaseName));
  try {
    // see if we're opening a database we've already opened recently
    const existing = await metadataDatabase.get(metadataObjectStoreName, newDatabaseName);
    if (existing) {
      // if we have, update the last access date and do nothing else
      await metadataDatabase.merge(metadataObjectStoreName, { lastAccess: Date.now() }, newDatabaseName);
      return;
    }

    // store the database name we're about to create
    await metadataDatabase.put(
      metadataObjectStoreName,
      { name: newDatabaseName, lastAccess: Date.now() },
      newDatabaseName
    );

    // get all existing databases...if there are fewer than max, do nothing
    const all = await metadataDatabase.getAll(metadataObjectStoreName);
    const old = all.sort((a, b) => b.lastAccess - a.lastAccess).slice(maxDatabases);
    // go through the list of old databases and try to delete each of them
    const promises = old.map(async (lastUsed) => {
      if (await tryDelete(lastUsed.name)) {
        await metadataDatabase.delete(metadataObjectStoreName, lastUsed.name);
      }
    });
    await Promise.all(promises);
  } finally {
    await metadataDatabase.close();
  }
}

export async function doesDatabaseExist(databaseName: string, metadataDatabaseName: string): Promise<boolean> {
  const metadataDatabase = await Database.get(getConfig(metadataDatabaseName));
  const entry = await metadataDatabase.get(metadataObjectStoreName, databaseName);
  await metadataDatabase.close();
  log.info(`Checking if database exists returned ${!!entry} with...`, { databaseName });
  return !!entry;
}
