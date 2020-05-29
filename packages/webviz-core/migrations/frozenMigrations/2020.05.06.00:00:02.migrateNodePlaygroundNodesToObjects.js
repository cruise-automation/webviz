// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { cloneDeep } from "lodash";

function migrateNodePlaygroundNodesToObjects(originalPanelsState: any): any {
  if (originalPanelsState.userNodes) {
    const panelsState = cloneDeep(originalPanelsState);
    for (const [nodeName, fieldVal] of Object.entries(panelsState.userNodes)) {
      if (typeof fieldVal === "string") {
        panelsState.userNodes[nodeName] = { name: nodeName, sourceCode: fieldVal };
      }
    }
    return panelsState;
  }
  return originalPanelsState;
}

export default migrateNodePlaygroundNodesToObjects;
