// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { getShouldDisplayMsg } from "./index";

describe("RosOutPanel", () => {
  describe("getShouldDisplayMsg", () => {
    const msg = {
      topic: "/some_topic",
      receiveTime: { sec: 123, nsec: 456 },
      message: {
        msg: "Couldn't find int 83757.",
        level: 2,
        name: "/some_topic",
      },
    };

    describe("when minLogLevel is higher than msg level", () => {
      const minLogLevel = 3;
      it("returns false when minLogLevel is higher than msg level", () => {
        expect(getShouldDisplayMsg(msg, minLogLevel, [])).toEqual(false);
      });
    });

    describe("when minLogLevel lower than or equal to  msg level", () => {
      const minLogLevel = 1;

      it("returns true when searchTerms is empty", () => {
        expect(getShouldDisplayMsg(msg, minLogLevel, ["/some_topic"])).toEqual(true);
      });

      it("returns true when msg name contains search terms", () => {
        expect(getShouldDisplayMsg(msg, minLogLevel, ["some"])).toEqual(true);
      });

      it("returns true when msg contains search term", () => {
        expect(getShouldDisplayMsg(msg, minLogLevel, ["int"])).toEqual(true);
      });

      it("returns false when msg name doesn't contain any search terms", () => {
        expect(getShouldDisplayMsg(msg, minLogLevel, ["random"])).toEqual(false);
      });

      it("return true when minLogLevel equals msg level and msg contains search terms", () => {
        expect(getShouldDisplayMsg(msg, msg.message.level, ["int", "random"])).toEqual(true);
      });
    });
  });
});
