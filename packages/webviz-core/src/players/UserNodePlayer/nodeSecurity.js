// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

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

// Exported for tests. Pulled from example here: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest.
export const digestMessage = async (message: string) => {
  const msgUint8 = new TextEncoder().encode(message); // encode as (utf-8) Uint8Array
  const hashBuffer = await window.crypto.subtle.digest({ name: "SHA-256" }, msgUint8); // hash the message
  const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join(""); // convert bytes to hex string
  return hashHex;
};

type NodeSecInput = { id: string, sourceCode: string };

const storage = new Storage();

// ONLY TO BE USED IN THE EVENT OF EXPLICIT USER CONFIRMATION
export const trustUserNode = async ({ id, sourceCode }: NodeSecInput): Promise<void> => {
  const hash = await digestMessage(sourceCode);
  storage.set(id, hash);
};

export const isUserNodeTrusted = async ({ id, sourceCode }: NodeSecInput): Promise<boolean> => {
  const storedHash = storage.get(id);
  const hash = await digestMessage(sourceCode);
  return storedHash === hash;
};
