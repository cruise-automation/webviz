// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import getPanelTypeFromId from "webviz-core/migrations/frozenHelpers/getPanelTypeFromId";

// DUPLICATED from webviz-core/src/util to be used for frozen migrations
function getPanelIdWithNewType(id: string, newPanelType: string): string {
  return id.replace(getPanelTypeFromId(id), newPanelType);
}

export default getPanelIdWithNewType;
