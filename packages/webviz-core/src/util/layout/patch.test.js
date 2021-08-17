// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import CBOR from "cbor-js";
import zlib from "zlib";

import { defaultPlaybackConfig } from "webviz-core/src/reducers/panels";
import {
  getLayoutPatch,
  getUpdatedURLWithPatch,
  getUpdatedURLWithNewVersion,
  dictForPatchCompression,
  deflatePatch,
  applyPatchToLayout,
} from "webviz-core/src/util/layout/patch";
import sendNotification from "webviz-core/src/util/sendNotification";

const DEFAULT_LAYOUT = {
  layout: "",
  savedProps: {},
  globalVariables: {},
  userNodes: {},
  linkedGlobalVariables: [],
  playbackConfig: { speed: 0.1, messageOrder: "receiveTime", timeDisplayMethod: "ROS" },
};

describe("patch", () => {
  describe("getLayoutPatch", () => {
    it("gets the diff between 2 panel states", () => {
      expect(
        getLayoutPatch(
          {
            layout: "abc",
            globalVariables: { globalVar1: 1, globalVar2: 2 },
            linkedGlobalVariables: [],
            playbackConfig: defaultPlaybackConfig,
            userNodes: {},
            savedProps: {},
          },
          {
            layout: "def",
            globalVariables: { globalVar1: 1, globalVar3: 3 },
            linkedGlobalVariables: [],
            playbackConfig: { ...defaultPlaybackConfig, speed: 0.5 },
            userNodes: {},
            savedProps: {},
          }
        )
      ).toEqual(
        '{"layout":["abc","def"],"globalVariables":{"globalVar2":[2,0,0],"globalVar3":[3]},"playbackConfig":{"speed":[0.2,0.5]}}'
      );
    });

    it("gets diff between two differing json structures", () => {
      const patch = getLayoutPatch(
        {
          ...DEFAULT_LAYOUT,
          layout: "abc",
        },
        {
          ...DEFAULT_LAYOUT,
          layout: {
            direction: "row",
            first: "abc",
            second: "cde",
          },
        }
      );
      expect(patch).toEqual('{"layout":["abc",{"direction":"row","first":"abc","second":"cde"}]}');
    });
  });

  describe("getUpdatedURLWithPatch", () => {
    it("returns a new URL with the patch attached", () => {
      const stringifiedPatch = JSON.stringify({ somePatch: "somePatch" });
      const diffBuffer = Buffer.from(CBOR.encode(JSON.parse(stringifiedPatch)));
      const dictionaryBuffer = Buffer.from(CBOR.encode(dictForPatchCompression));
      const compressedPatch = zlib.deflateSync(diffBuffer, { dictionary: dictionaryBuffer }).toString("base64");
      expect(getUpdatedURLWithPatch("?layout=foo&someKey=someVal", stringifiedPatch)).toMatch(
        `?layout=foo&someKey=someVal&patch=${encodeURIComponent(compressedPatch)}`
      );
    });
    it("does not change the search if the diff input is empty", async () => {
      const search = "?layout=foo&someKey=someVal&patch=bar";
      expect(getUpdatedURLWithPatch(search, "")).toBe(search);
    });
  });

  describe("getUpdatedURLWithNewVersion", () => {
    it("returns a new URL with the version attached", () => {
      const timestampAndPatchHash = "1596745459_9c4a1b372d257004f40918022d87d3ae0fa3bf871116516ec0cbc010bd67ce8";
      expect(getUpdatedURLWithNewVersion("?layout=foo&patch=somePatch", "bar", timestampAndPatchHash)).toMatch(
        `?layout=bar%40${timestampAndPatchHash}`
      );
    });
  });

  describe("applyPatchToLayout", () => {
    it("handles patches", () => {
      const patch = deflatePatch({ globalVariables: [{}, { foo: "bar" }] });
      expect(applyPatchToLayout(patch, DEFAULT_LAYOUT)).toEqual({
        ...DEFAULT_LAYOUT,
        globalVariables: { foo: "bar" },
      });
    });
    it("handles patches with differing json structures", () => {
      const patch = deflatePatch({ layout: ["abc", { direction: "row", first: "abc", second: "cde" }] });
      expect(
        applyPatchToLayout(patch, {
          ...DEFAULT_LAYOUT,
          layout: "abc",
        })
      ).toEqual({
        ...DEFAULT_LAYOUT,
        layout: { direction: "row", first: "abc", second: "cde" },
      });
    });
    it("handles invalid patches", () => {
      applyPatchToLayout("abc", DEFAULT_LAYOUT);

      expect(sendNotification).toHaveBeenLastCalledWith(expect.any(String), expect.any(String), "app", "error");
      sendNotification.expectCalledDuringTest();
    });
  });
});
