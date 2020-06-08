// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { last } from "lodash";

import { CURRENT_LAYOUT_VERSION } from "webviz-core/migrations/constants";

const validateVersions = (versionNumbers: string[]) => {
  return parseInt(last(versionNumbers.sort())) === CURRENT_LAYOUT_VERSION;
};

export default validateVersions;
