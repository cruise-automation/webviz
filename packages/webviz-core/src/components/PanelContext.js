// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";

import type { SaveConfig, PanelConfig, UpdatePanelConfig, OpenSiblingPanel } from "webviz-core/src/types/panels";

export type PanelContextType<T> = {|
  // TODO(PanelAPI): private API, should not be used in panels
  type: string,
  id: string,
  title: string,
  tabId?: string,

  // TODO(PanelAPI): move to usePanelConfig()
  config: PanelConfig,
  saveConfig: SaveConfig<T>,

  // TODO(PanelAPI): move to usePanelActions()
  updatePanelConfig: UpdatePanelConfig<T>,
  openSiblingPanel: OpenSiblingPanel,
  enterFullscreen: () => void,

  isHovered: boolean,
  isFocused: boolean,
|};
// Context used for components to know which panel they are inside
const PanelContext = React.createContext<?PanelContextType<PanelConfig>>();

export function usePanelContext(): PanelContextType<PanelConfig> {
  const context = React.useContext(PanelContext);
  if (!context) {
    throw new Error("Tried to use PanelContext outside a <PanelContext.Provider />");
  }
  return context;
}

export default PanelContext;
