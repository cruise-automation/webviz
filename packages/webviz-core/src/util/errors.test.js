// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import React from "react";

import { AppError } from "webviz-core/src/util/errors";

describe("errors", () => {
  describe("AppError", () => {
    it("copies the original error", () => {
      const err = new Error("simple error");
      const { message } = new AppError(err);
      expect(message.includes(err.message)).toBeTruthy();
    });
    it("captures extra info", () => {
      const extraInfo = { foo: "bar" };
      const err = new AppError(new Error("simple error"), extraInfo);
      expect(err.extraInfo).toEqual(extraInfo);
    });
    it("uses 'details' as the message if it is a string", () => {
      const { message } = new AppError("internal error", null);
      expect(message).toEqual("internal error");
    });
    it("returns 'Unknown Error' if the details object is a React Node", () => {
      const { message } = new AppError(React.createElement(""), null);
      expect(message).toEqual("Unknown Error");
    });
    it("stringifies extraInfo when possible", () => {
      const { message } = new AppError("internal error", { foo: "bar" });
      expect(message.includes('{"foo":"bar"}')).toBeTruthy();
    });
    it("catches cyclic object values in extraInfo", () => {
      const obj: { [key: string]: any } = { foo: null };
      obj.foo = obj;
      const { message } = new AppError("internal error", obj);
      expect(message.includes("[ Either cyclic object or object with BigInt(s) ]")).toBeTruthy();
    });
    it("catches BigInt values in extraInfo", () => {
      // $FlowFixMe - flow does not support BigInt https://github.com/facebook/flow/issues/6639
      const { message } = new AppError("internal error", { val: BigInt(10) }); // eslint-disable-line no-undef
      expect(message.includes("[ Either cyclic object or object with BigInt(s) ]")).toBeTruthy();
    });
  });
});
