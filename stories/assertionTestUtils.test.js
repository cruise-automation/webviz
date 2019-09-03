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

    describe("toBeCloseTo", () => {
      it("throws an error with incorrect expected type", () => {
        let error;
        try {
          assertionTestExpect({}).toBeCloseTo(1);
        } catch (e) {
          error = e;
        }
        expect(error).not.toEqual(undefined);
      });

      it("throws an error with incorrect comparison type", () => {
        let error;
        try {
          // $FlowFixMe
          assertionTestExpect(1).toBeCloseTo({});
        } catch (e) {
          error = e;
        }
        expect(error).not.toEqual(undefined);
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
        let error;
        try {
          assertionTestExpect(1000.1).toBeCloseTo(1000);
        } catch (e) {
          error = e;
        }
        expect(error).not.toEqual(undefined);
      });

      it("errors on numbers that are too small", () => {
        let error;
        try {
          assertionTestExpect(1000).toBeCloseTo(1000.1);
        } catch (e) {
          error = e;
        }
        expect(error).not.toEqual(undefined);
      });
    });
  });
});
