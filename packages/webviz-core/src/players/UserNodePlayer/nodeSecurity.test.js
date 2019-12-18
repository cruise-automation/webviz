// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import uuid from "uuid";

import { digestMessage, trustUserNode, isUserNodeTrusted } from "webviz-core/src/players/UserNodePlayer/nodeSecurity";

describe("nodeSecurity", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("creates a hexadecimal string", async () => {
    const hash = await digestMessage("hello webviz");
    expect(hash).toEqual("9ba480f1611c0a1e8b025eb8dfd82cd218bce11bcde6ee43208af6f68bc4a946");
  });

  it("does not trust nodes not in localStorage", async () => {
    const isTrusted = await isUserNodeTrusted({ id: uuid.v4(), sourceCode: "/* malicious code */" });
    expect(isTrusted).toBeFalsy();
  });

  it("trusts nodes saved to localStorage", async () => {
    const id = uuid.v4();
    const sourceCode = "/* trust-worthy code */";

    await trustUserNode({ id, sourceCode });
    const isTrusted = await isUserNodeTrusted({ id, sourceCode });
    expect(isTrusted).toBeTruthy();
  });

  it("does not trust nodes saved to localStorage but with different code", async () => {
    const id = uuid.v4();
    const sourceCode = "/* trusty code */";

    await trustUserNode({ id, sourceCode });
    const isTrusted = await isUserNodeTrusted({ id, sourceCode: "/* stubbed in malicious code */" });
    expect(isTrusted).toBeFalsy();
  });
});
