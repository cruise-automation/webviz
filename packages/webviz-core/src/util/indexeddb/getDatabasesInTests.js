// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

export function getDatabasesInTests(): Map<string, any> {
  // until indexedDB.databases() lands in the spec, get the databases on the fake by reaching into it
  return global.indexedDB._databases; // eslint-disable-line no-underscore-dangle
}
