// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";

import type { SaveConfig, PanelConfig, UpdatePanelConfig, OpenSiblingPanel } from "webviz-core/src/types/panels";

export type PanelContextType<T> = {
  type: string,
  id: string,
  title: string,
  topicPrefix?: string,
  config: PanelConfig,
  saveConfig: SaveConfig<T>,
  updatePanelConfig: UpdatePanelConfig<T>,
  openSiblingPanel: OpenSiblingPanel,
};
// Context used for components to know which panel they are inside
// NOTE: using inexact type and default to empty object so we don't have to alway check for nullability before
// using any of the PanelContext fields. We know it should be used within the PanelContext.
const PanelContext = React.createContext<PanelContextType<PanelConfig>>({});

export default PanelContext;
