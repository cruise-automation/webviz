// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import diff from "jest-diff";
import { isEqual } from "lodash";

// Always mock reportError and fail if it was called during the test without resetting it. Note that
// we have to do this here instead of in setup.js since here we have access to jest methods.
jest.mock("webviz-core/src/util/reportError", () => {
  // Duplicate the report error functionality here with passing errors to handlers, if they exist.
  const fn: any = jest.fn((...args) => {
    if (fn.handler) {
      fn.handler(...args);
    }
  });
  fn.setErrorHandler = (handler) => {
    fn.handler = handler;
  };
  // Ensure that there is no handler by default.
  fn.setErrorHandler(null);
  return fn;
});
beforeEach(() => {
  const reportError: any = require("webviz-core/src/util/reportError");
  reportError.expectCalledDuringTest = () => {
    if (reportError.mock.calls.length === 0) {
      // $FlowFixMe
      fail("Expected reportError to have been called during the test, but it was never called!"); // eslint-disable-line
    }
    reportError.mockClear();
    // Reset the error handler to the default (no error handler).
    reportError.setErrorHandler(null);
  };
});
afterEach(() => {
  const reportError: any = require("webviz-core/src/util/reportError");
  if (reportError.mock.calls.length > 0) {
    const calls = reportError.mock.calls;
    reportError.mockClear();
    // Reset the error handler to the default (no error handler).
    reportError.setErrorHandler(null);
    // $FlowFixMe
    fail(`reportError has been called during this test (call reportError.expectCalledDuringTest(); at the end of your test if you expect this): ${JSON.stringify(calls)}`); // eslint-disable-line
  }
});

// this file runs once jest has injected globals so you can modify the expect matchers
global.expect.extend({
  // expects an array to contain exactly the other elements
  // in otherArray using isEqual
  toContainOnly(received, expectedArray) {
    const receivedArray = Array.from(received);
    let pass = true;
    if (receivedArray.length !== expectedArray.length) {
      pass = false;
    } else {
      for (const expectedItem of expectedArray) {
        if (!receivedArray.some((receivedItem) => isEqual(receivedItem, expectedItem))) {
          pass = false;
          break;
        }
      }
      for (const receivedItem of receivedArray) {
        if (!expectedArray.some((expectedItem) => isEqual(receivedItem, expectedItem))) {
          pass = false;
          break;
        }
      }
    }
    return {
      pass,
      actual: receivedArray,
      message: () => {
        const diffString = diff(expectedArray, receivedArray, { expand: this.expand });
        return `${this.utils.matcherHint(pass ? ".not.toContainOnly" : ".toContainOnly")}\n\nExpected value${
          pass ? " not" : ""
        } to contain only:\n  ${this.utils.printExpected(expectedArray)}\nReceived:\n  ${this.utils.printReceived(
          receivedArray
        )}\n\nDifference:\n\n${diffString}`;
      },
    };
  },
});

describe("custom expectations", () => {
  describe("toContainOnly", () => {
    it("passes when arrays match", () => {
      expect([1]).toContainOnly([1]);
      // $FlowFixMe
      expect([1, 2]).not.toContainOnly([1]);
      // $FlowFixMe
      expect([2]).not.toContainOnly([1]);
      expect([{ foo: "bar" }]).toContainOnly([{ foo: "bar" }]);
      expect([{ foo: "bar" }, 2, { foo: "baz" }]).toContainOnly([2, { foo: "baz" }, { foo: "bar" }]);
    });

    it("throws when arrays do not match", () => {
      expect(() => {
        expect([{ foo: "bar" }]).toContainOnly([{ foo: "bar2" }]);
      }).toThrow();
      expect(() => {
        expect([{ foo: "bar" }]).toContainOnly([{ foo: "bar" }, { foo: "baz" }]);
      }).toThrow();
    });

    it("handles same-length arrays", () => {
      expect([1, 1]).toContainOnly([1, 1]);
      // $FlowFixMe
      expect([1, 1]).not.toContainOnly([1, 2]);
      // $FlowFixMe
      expect([1, 2]).not.toContainOnly([1, 1]);
    });
  });
});
