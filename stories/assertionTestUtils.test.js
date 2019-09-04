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
        expect(() => assertionTestExpect({ some: "otherthing" }).toEqual({ some: "thing" })).toThrow();
      });
    });

    describe("toBeCloseTo", () => {
      it("throws an error with incorrect expected type", () => {
        expect(() => assertionTestExpect({}).toBeCloseTo(1)).toThrow();
      });

      it("throws an error with incorrect comparison type", () => {
        // $FlowFixMe
        expect(() => assertionTestExpect(1).toBeCloseTo({})).toThrow();
      });

      it("handles exact numbers", () => {
        assertionTestExpect(1000.0001).toBeCloseTo(1000.0001);
      });

      it("handles smaller numbers", () => {
        assertionTestExpect(1000.0001).toBeCloseTo(1000);
      });

      it("handles larger numbers", () => {
        assertionTestExpect(1000.0001).toBeCloseTo(1000.0002);
      });

      it("errors on numbers that are too large", () => {
        expect(() => assertionTestExpect(1000.1).toBeCloseTo(1000)).toThrow();
      });

      it("errors on numbers that are too small", () => {
        expect(() => assertionTestExpect(1000).toBeCloseTo(1000.1)).toThrow();
      });
    });
  });
});
