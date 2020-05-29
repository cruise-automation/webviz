// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { cloneDeep } from "lodash";

function migrateGlobalDataToGlobalVariables(originalPanelsState: any): any {
  const globalData = originalPanelsState.globalData;
  if (globalData) {
    const panelsState = cloneDeep(originalPanelsState);
    // If `globalVariables` key is not present, create a new key and assign the globalData value
    if (!("globalVariables" in originalPanelsState)) {
      panelsState.globalVariables = globalData;
    }
    delete panelsState.globalData;
    return panelsState;
  }
  return originalPanelsState;
}

export default migrateGlobalDataToGlobalVariables;
