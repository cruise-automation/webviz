// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { expect as assertionTestExpect } from "./assertionTestUtils";

describe("assertionTestUtils", () => {
  describe("expect", () => {
    describe("toEqual", () => {
      it("handles exact equality", () => {
        const object = { some: "thing" };
        assertionTestExpect(object).toEqual(object);
      });
      it("handles inexact equality", () => {
        assertionTestExpect({ some: "thing" }).toEqual({ some: "thing" });
      });
      it("fails correctly", () => {
        let error;
        try {
          assertionTestExpect({ some: "otherthing" }).toEqual({ some: "thing" });
        } catch (e) {
          error = e;
        }
        expect(error).not.toEqual(undefined);
      });
    });
  });
});
