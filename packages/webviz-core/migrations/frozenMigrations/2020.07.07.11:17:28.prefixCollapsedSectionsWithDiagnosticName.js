// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { cloneDeep } from "lodash";

import getPanelTypeFromId from "webviz-core/migrations/frozenHelpers/getPanelTypeFromId";

export default function prefixCollapsedSectionsWithDiagnosticName(originalPanelsState: any): any {
  if (!originalPanelsState.savedProps) {
    return originalPanelsState;
  }
  const panelsState = cloneDeep(originalPanelsState);
  for (const panelId of Object.keys(panelsState.savedProps)) {
    if (getPanelTypeFromId(panelId) === "DiagnosticStatusPanel") {
      const { selectedName, collapsedSections = [] } = panelsState.savedProps[panelId];
      if (selectedName && collapsedSections.length) {
        panelsState.savedProps[panelId].collapsedSections = collapsedSections.map((section) =>
          typeof section === "string" ? { name: selectedName, section } : section
        );
      }
    }
  }
  return panelsState;
}
