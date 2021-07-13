// @flow
//
//  Copyright (c) 2021-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { applyPatchToLayout } from "webviz-core/src/actions/panels";
import { deflatePatch } from "webviz-core/src/util/layout";
import sendNotification from "webviz-core/src/util/sendNotification";

const DEFAULT_LAYOUT = {
  layout: "",
  savedProps: {},
  globalVariables: {},
  userNodes: {},
  linkedGlobalVariables: [],
  playbackConfig: { speed: 0.1, messageOrder: "receiveTime", timeDisplayMethod: "ROS" },
};

describe("panels", () => {
  describe("applyPatchToLayout", () => {
    it("handles patches", () => {
      const patch = deflatePatch({ globalVariables: [{}, { foo: "bar" }] });
      expect(applyPatchToLayout(patch, DEFAULT_LAYOUT)).toEqual({
        ...DEFAULT_LAYOUT,
        globalVariables: { foo: "bar" },
      });
    });
    it("handles invalid patches", () => {
      applyPatchToLayout("abc", DEFAULT_LAYOUT);

      expect(sendNotification).toHaveBeenLastCalledWith(expect.any(String), expect.any(String), "app", "error");
      sendNotification.expectCalledDuringTest();
    });
  });
});
