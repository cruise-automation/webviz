// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { cloneDeep } from "lodash";

import getPanelTypeFromId from "webviz-core/migrations/frozenHelpers/getPanelTypeFromId";

const migrateConfigFieldName = (panelType: string, oldField: string, newField: string) => (
  originalPanelsState: any
): any => {
  const panelsState = cloneDeep(originalPanelsState);
  for (const id of Object.keys(panelsState.savedProps)) {
    if (getPanelTypeFromId(id) === panelType && panelsState.savedProps[id][oldField]) {
      panelsState.savedProps[id][newField] = panelsState.savedProps[id][oldField];
      delete panelsState.savedProps[id][oldField];
    }
  }
  return panelsState;
};

export default migrateConfigFieldName;
