// @flow
//
//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import stringHash from "string-hash";

import Storage from "webviz-core/src/util/Storage";

/**
 * Node Security
 *
 * The following methods are used to tool the "trustworthiness" of our user
 * defined scripts. Please note that the 'trustUserNode' method should only be used
 * in the event of an explicit user action, which implies that they trust the
 * script to be run.
 *
 * It is important that we both set a unique identifier to
 * localStorage AND set a hashed instance of the code, as we do not want bad
 * actors spoofing the id of a layout while shimming in their malicious code.
 */

type NodeSecInput = { id: string, sourceCode: string };

const storage = new Storage();

// ONLY TO BE USED IN THE EVENT OF EXPLICITY USER CONFIRMATION
export const trustUserNode = ({ id, sourceCode }: NodeSecInput): void => {
  storage.set(id, stringHash(sourceCode) /* returns a number between 0 and 4294967295 (inclusive) */);
};

export const isUserNodeTrusted = ({ id, sourceCode }: NodeSecInput): boolean => {
  const hash = storage.get(id);
  return hash === stringHash(sourceCode);
};
