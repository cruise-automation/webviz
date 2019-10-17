// @flow
//
//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import uuid from "uuid";

import { trustUserNode, isUserNodeTrusted } from "webviz-core/src/players/UserNodePlayer/nodeSecurity";

describe("nodeSecurity", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("does not trust nodes not in localStorage", () => {
    expect(isUserNodeTrusted({ id: uuid.v4(), sourceCode: "/* malicious code */" })).toBeFalsy();
  });

  it("trusts nodes saved to localStorage", () => {
    const id = uuid.v4();
    const sourceCode = "/* trust-worthy code */";

    trustUserNode({ id, sourceCode });
    expect(isUserNodeTrusted({ id, sourceCode })).toBeTruthy();
  });

  it("does not trust nodes saved to localStorage but with different code", () => {
    const id = uuid.v4();
    const sourceCode = "/* trusty code */";

    trustUserNode({ id, sourceCode });
    expect(isUserNodeTrusted({ id, sourceCode: "/* stubbed in malicious code */" })).toBeFalsy();
  });
});
