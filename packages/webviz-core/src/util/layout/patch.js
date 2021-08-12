// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import CBOR from "cbor-js";
import { cloneDeep } from "lodash";
import zlib from "zlib";

import { type PanelsState } from "webviz-core/src/reducers/panels";
import { LAYOUT_QUERY_KEY, PATCH_QUERY_KEY } from "webviz-core/src/util/globalConstants";
import { stringifyParams } from "webviz-core/src/util/layout";
import sendNotification from "webviz-core/src/util/sendNotification";

const jsondiffpatch = require("jsondiffpatch").create({});

export function getLayoutPatch(baseState: ?PanelsState, newState: ?PanelsState): string {
  const delta = jsondiffpatch.diff(baseState, newState);
  return delta ? JSON.stringify(delta) : "";
}

const stateKeyMap = {
  layout: "l",
  savedProps: "sa",
  globalVariables: "g",
  userNodes: "u",
  linkedGlobalVariables: "lg",
  version: "v",
  playbackConfig: "p",
};
const layoutKeyMap = { direction: "d", first: "f", second: "se", row: "r", column: "c", splitPercentage: "sp" };
export const dictForPatchCompression = { ...layoutKeyMap, ...stateKeyMap };

export function deflatePatch(jsObj: {}) {
  const diffBuffer = Buffer.from(CBOR.encode(jsObj));
  const dictionaryBuffer = Buffer.from(CBOR.encode(dictForPatchCompression));
  return zlib.deflateSync(diffBuffer, { dictionary: dictionaryBuffer }).toString("base64");
}

export function getUpdatedURLWithPatch(search: string, diff: string): string {
  // Return the original search directly if the diff is empty.
  if (!diff) {
    return search;
  }
  const params = new URLSearchParams(search);
  const zlibPatch = deflatePatch(JSON.parse(diff));
  params.set(PATCH_QUERY_KEY, zlibPatch);
  return stringifyParams(params);
}

export function getUpdatedURLWithNewVersion(search: string, name: string, version?: string): string {
  const params = new URLSearchParams(search);
  params.set(LAYOUT_QUERY_KEY, `${name}${version ? `@${version}` : ""}`);
  params.delete(PATCH_QUERY_KEY);
  return stringifyParams(params);
}

// If we have a URL patch, the user has edited the layout.
export function hasEditedLayout() {
  const params = new URLSearchParams(window.location.search);
  return params.has(PATCH_QUERY_KEY);
}

export function applyPatchToLayout(patch: ?string, layout: PanelsState): PanelsState {
  if (!patch) {
    return layout;
  }
  try {
    const patchBuffer = Buffer.from(patch, "base64");
    const dictionaryBuffer = Buffer.from(CBOR.encode(dictForPatchCompression));
    const uint8Arr = zlib.inflateSync(patchBuffer, { dictionary: dictionaryBuffer });

    if (!uint8Arr) {
      return layout;
    }

    const buffer = uint8Arr.buffer.slice(uint8Arr.byteOffset, uint8Arr.byteLength + uint8Arr.byteOffset);
    const bufferToJS = CBOR.decode(buffer);
    const clonedLayout = cloneDeep(layout);
    jsondiffpatch.patch(clonedLayout, bufferToJS);
    return clonedLayout;
  } catch (e) {
    sendNotification(
      "Failed to apply patch on top of the layout.",
      `Ignoring the patch "${patch}".\n\n${e}`,
      "app",
      "error"
    );
  }
  return layout;
}
