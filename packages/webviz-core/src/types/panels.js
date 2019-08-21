// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { type GlobalData } from "webviz-core/src/hooks/useGlobalData";

export type PanelConfig = { [key: string]: any };
export type PerPanelFunc<Config> = (Config) => Config;

export type NodePayload = {
  [outputName: string]: ?string,
};

export type SaveConfigPayload = {
  id: string,
  // if you set silent to true, the url will not be stripped of a layout id
  // after the props are saved - useful for minor or background UI operations modifying insignificant panel props
  silent?: boolean,
  // if you set override to true, existing config will be completely overriden by new passed in config
  override?: boolean,
  config: PanelConfig,
};

export type SaveFullConfigPayload = {
  panelType: string,
  perPanelFunc: PerPanelFunc<any>,
};

export type ImportPanelLayoutPayload = {
  // layout is the object passed to react-mosaic
  layout?: any,
  savedProps?: { [panelId: string]: PanelConfig },
  globalData?: GlobalData,
  skipSettingLocalStorage?: boolean,
};

export type SaveConfig<Config> = ($Shape<Config>, ?{ keepLayoutInUrl?: boolean }) => void;

export type UpdatePanelConfig<Config> = (panelType: string, perPanelFunc: PerPanelFunc<Config>) => void;

export type OpenSiblingPanel = (string, cb: (PanelConfig) => PanelConfig) => void;
