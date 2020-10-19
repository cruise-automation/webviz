// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { cloneDeep } from "lodash";

import getPanelTypeFromId from "webviz-core/migrations/frozenHelpers/getPanelTypeFromId";

export default function addAutoFormatOnSaveToNodePlaygroundConfig(originalPanelsState: any): any {
  const panelsState = cloneDeep(originalPanelsState);
  for (const id of Object.keys(panelsState.savedProps)) {
    if (getPanelTypeFromId(id) === "NodePlayground" && panelsState.savedProps[id].autoFormatOnSave === undefined) {
      panelsState.savedProps[id].autoFormatOnSave = true;
    }
  }
  return panelsState;
}
