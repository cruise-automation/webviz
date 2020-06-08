// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { cloneDeep } from "lodash";

import replacePanelLayout from "webviz-core/migrations/frozenHelpers/replacePanelLayout";

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

const migratePanelType = (oldPanelType: string, newPanelType: string) => (originalPanelsState: any): any => {
  const panelsState = cloneDeep(originalPanelsState);

  panelsState.layout = replacePanelLayout(panelsState.layout, oldPanelType, (id) => {
    if (id.startsWith(oldPanelType)) {
      return id.replace(oldPanelType, newPanelType);
    }
  });

  panelsState.savedProps = replacePanelSavedProps(panelsState.savedProps, oldPanelType, newPanelType);
  return panelsState;
};

export default migratePanelType;
