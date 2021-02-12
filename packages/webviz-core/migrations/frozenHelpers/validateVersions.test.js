// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { CURRENT_LAYOUT_VERSION } from "webviz-core/migrations/constants";
import validateVersions from "webviz-core/migrations/frozenHelpers/validateVersions";

describe("validateVersions", () => {
  it(`returns true if last version matches CURRENT_LAYOUT_VERSION`, () => {
    expect(validateVersions(["001", `00${CURRENT_LAYOUT_VERSION}`])).toEqual(true);
    expect(validateVersions([`00${CURRENT_LAYOUT_VERSION}`, "001"])).toEqual(true);
    expect(validateVersions([`00${CURRENT_LAYOUT_VERSION}`])).toEqual(true);
  });

  it(`returns false if last version does not match CURRENT_LAYOUT_VERSION`, () => {
    expect(validateVersions(["001", `00${CURRENT_LAYOUT_VERSION - 1}`])).toEqual(false);
    expect(validateVersions([`00${CURRENT_LAYOUT_VERSION - 1}`, "001"])).toEqual(false);
    expect(validateVersions(["001", `00${CURRENT_LAYOUT_VERSION}`, `00${CURRENT_LAYOUT_VERSION + 1}`])).toEqual(false);
  });
});
