// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { cloneDeep } from "lodash";

import getPanelTypeFromId from "webviz-core/migrations/frozenHelpers/getPanelTypeFromId";

// Stored configs for the DiagnosticSummary and DiagnosticStatusPanel prior to this version used
// an empty string to signal "select the whole hardware id". This is now represented by a null name.
export default function removeEmptyDiagnosticsConfigNames(originalPanelsState: any): any {
  const panelsState = cloneDeep(originalPanelsState);
  if (!panelsState.savedProps) {
    // Not present in some tests.
    return panelsState;
  }
  for (const id of Object.keys(panelsState.savedProps)) {
    const panelType = getPanelTypeFromId(id);
    const config = panelsState.savedProps[id];
    if ((panelType === "DiagnosticSummary" || panelType === "DiagnosticStatusPanel") && config.selectedName === "") {
      config.selectedName = undefined;
    }
  }
  return panelsState;
}
