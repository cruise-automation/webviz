// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

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
