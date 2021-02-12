// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { decodeBayerRGGB8 } from "./decodings";

describe("decodeBayer*()", () => {
  it("works for simple data", () => {
    const output = new Uint8ClampedArray(2 * 2 * 4);
    decodeBayerRGGB8(new Uint8Array([10, 20, 30, 40]), 2, 2, output);
    expect(output).toStrictEqual(
      // prettier-ignore
      new Uint8ClampedArray([
        10, 20, 40, 255,     10, 20, 40, 255,
        10, 30, 40, 255,     10, 30, 40, 255,
      ])
    );
  });
});
