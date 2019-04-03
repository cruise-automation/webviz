// @flow

import diff from "jest-diff";
import { isEqual } from "lodash";
import "react-hooks-testing-library/cleanup-after-each";

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
