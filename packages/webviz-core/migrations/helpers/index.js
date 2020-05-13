// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { cloneDeep, isEmpty } from "lodash";

import { type PanelsState } from "webviz-core/src/reducers/panels";
import type { MosaicNode } from "webviz-core/src/types/panels";
import { TAB_PANEL_TYPE } from "webviz-core/src/util/globalConstants";
import { getPanelTypeFromId } from "webviz-core/src/util/layout";

function replacePanelSavedProps(savedProps: any, oldPanelType: string, newPanelType: string) {
  for (const panelKey of Object.keys(savedProps)) {
    if (panelKey.startsWith(oldPanelType)) {
      const prevSavedProps = savedProps[panelKey];
      delete savedProps[panelKey];
      savedProps[panelKey.replace(oldPanelType, newPanelType)] = prevSavedProps;
    }
  }
  return savedProps;
}

export function replacePanelLayout(layout: MosaicNode, oldPanelType: string, replacer: (id: string) => any): any {
  if (typeof layout === "object" && !isEmpty(layout)) {
    return {
      ...layout,
      first: replacePanelLayout(layout.first, oldPanelType, replacer),
      second: replacePanelLayout(layout.second, oldPanelType, replacer),
    };
  } else if (typeof layout === "string" && layout.length > 0 && getPanelTypeFromId(layout) === oldPanelType) {
    return replacer(layout);
  }
  return layout;
}

// Runs replacePanelLayout on all layouts stored in tab panels' savedProps
export function replaceSavedPropsLayouts(savedProps: {}, oldPanelType: string, replacer: (id: string) => any): {} {
  return Object.keys(savedProps).reduce((result: {}, panelId) => {
    if (getPanelTypeFromId(panelId) === TAB_PANEL_TYPE) {
      return {
        ...result,
        [panelId]: {
          ...result[panelId],
          tabs: result[panelId].tabs.map((tab) => ({
            ...tab,
            layout: replacePanelLayout(tab.layout, oldPanelType, replacer),
          })),
        },
      };
    }
    return result;
  }, savedProps);
}

export const migratePanelType = (oldPanelType: string, newPanelType: string) => (
  originalPanelsState: PanelsState
): PanelsState => {
  const panelsState = cloneDeep(originalPanelsState);

  panelsState.layout = replacePanelLayout(panelsState.layout, oldPanelType, (id) => {
    if (id.startsWith(oldPanelType)) {
      return id.replace(oldPanelType, newPanelType);
    }
  });

  panelsState.savedProps = replacePanelSavedProps(panelsState.savedProps, oldPanelType, newPanelType);
  return panelsState;
};

export const migrateConfigFieldName = (panelType: string, oldField: string, newField: string) => (
  originalPanelsState: PanelsState
): PanelsState => {
  const panelsState = cloneDeep(originalPanelsState);
  for (const id of Object.keys(panelsState.savedProps)) {
    if (getPanelTypeFromId(id) === panelType && panelsState.savedProps[id][oldField]) {
      panelsState.savedProps[id][newField] = panelsState.savedProps[id][oldField];
      delete panelsState.savedProps[id][oldField];
    }
  }
  return panelsState;
};

export const incrementVersion = (version: number) => (state: PanelsState): PanelsState => ({
  ...state,
  version,
});
