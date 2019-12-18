// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { type GlobalVariables } from "webviz-core/src/hooks/useGlobalVariables";
import { type LinkedGlobalVariables } from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/useLinkedGlobalVariables";

export type PanelConfig = { [key: string]: any };
export type PerPanelFunc<Config> = (Config) => Config;

export type PlaybackConfig = {
  speed: number,
};

export type UserNode = { name: string, sourceCode: string };
export type UserNodes = { [nodeId: string]: UserNode };

export type SaveConfigPayload = {
  id: string,
  // if you set silent to true, the url will not be stripped of a layout id
  // after the props are saved - useful for minor or background UI operations modifying insignificant panel props
  silent?: boolean,
  // if you set override to true, existing config will be completely overriden by new passed in config
  override?: boolean,
  config: PanelConfig,
  defaultConfig: PanelConfig,
};

export type SaveFullConfigPayload = {
  panelType: string,
  perPanelFunc: PerPanelFunc<any>,
};

export type ImportPanelLayoutPayload = {
  // layout is the object passed to react-mosaic
  layout: any,
  savedProps?: { [panelId: string]: PanelConfig },
  globalVariables?: GlobalVariables,
  userNodes?: UserNodes,
  linkedGlobalVariables?: LinkedGlobalVariables,
  skipSettingLocalStorage?: boolean,
};

export type SaveConfig<Config> = ($Shape<Config>, ?{ keepLayoutInUrl?: boolean }) => void;

export type UpdatePanelConfig<Config> = (panelType: string, perPanelFunc: PerPanelFunc<Config>) => void;

export type OpenSiblingPanel = (string, cb: (PanelConfig) => PanelConfig) => void;
