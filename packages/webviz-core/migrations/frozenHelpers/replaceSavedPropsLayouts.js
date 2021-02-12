// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import getPanelTypeFromId from "webviz-core/migrations/frozenHelpers/getPanelTypeFromId";
import replacePanelLayout from "webviz-core/migrations/frozenHelpers/replacePanelLayout";

const TAB_PANEL_TYPE = "Tab";
function replaceSavedPropsLayouts(savedProps: {}, oldPanelType: string, replacer: (id: string) => any): {} {
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

export default replaceSavedPropsLayouts;
