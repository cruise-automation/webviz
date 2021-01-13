// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { type PanelsState } from "webviz-core/src/reducers/panels";

export function layoutIdHasVersionInfo(layoutId: string) {
  return layoutId.match(/@\d+/g);
}

export function getLayoutNameAndVersion(layoutId: ?string): { name: string, version: string } {
  const layoutString = layoutId || "";
  const hasVersionInfo = layoutIdHasVersionInfo(layoutString);
  const atIndex = layoutString.lastIndexOf("@");
  const layoutName = hasVersionInfo ? layoutString.substr(0, atIndex) : layoutId;
  const version = layoutString.substr(atIndex + 1);
  return { name: layoutName || "", version };
}

export function getLayoutFolder(layoutName: ?string): string {
  // Returns "namespace/foldername" given "namespace/foldername/layoutname", or "" for empty or
  // missing layout names.
  return (layoutName ?? "").split("/", 2).join("/");
}

export function getPanelStateHash(panels: PanelsState): string {
  // If a layout has not yet been saved, or if the patch param is too long,
  // autosave the layout to GCS, using its hash as the filename
  // e.g. auto/private/me@getcruise.com/patchHash or private/me@getcruise.com/myLayout@version_patchHash
  const hash = require("crypto")
    .createHash("sha256")
    .update(JSON.stringify(panels))
    .digest("hex");

  // Truncating hash increases chance of collision, but still very unlikely.
  // 256 bits = 1/(2^128) chance of collision -> 64 bits (16 chars) = 1/(2^32) chance
  return hash.substring(0, Math.floor(hash.length / 4));
}

// e.g. `shared/someTeam/foo` or `private/someone@cruise.com/foo/bar
export function getFolderIdAndLayoutNameFromLayoutId(layoutId: string): {| folderId: string, layoutName: string |} {
  // nameParts is the actual layout name the user added when saving an layout. It may contain `/`.
  const [_sharedOrPrivateNamespace = "", folderId = "", ...nameParts] = layoutId.split("/");
  return { folderId, layoutName: nameParts.join("/") };
}
