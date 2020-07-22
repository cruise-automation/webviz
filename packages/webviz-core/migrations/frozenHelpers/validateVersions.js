// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { CURRENT_LAYOUT_VERSION } from "webviz-core/migrations/constants";

const validateVersions = (versionNumbers: string[]) => {
  const formattedVersions = versionNumbers.map((versionNumAsString) => parseInt(versionNumAsString));
  const latestVersion = Math.max(...formattedVersions);
  return latestVersion === CURRENT_LAYOUT_VERSION;
};

export default validateVersions;
