// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { type GlobalVariables } from "webviz-core/src/hooks/useGlobalVariables";
import { type LinkedGlobalVariables } from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/useLinkedGlobalVariables";
import { type PanelsState } from "webviz-core/src/reducers/panels";
import type { TimestampMethod } from "webviz-core/src/util/time";

// Mosaic Types
export type MosaicBranch = "first" | "second";
export type MosaicPath = MosaicBranch[];
export type MosaicKey = string;
export type MosaicDirection = "row" | "column";
export type MosaicDropTargetPosition = "top" | "bottom" | "left" | "right";
export type MosaicNode =
  | {
      direction: MosaicDirection,
      first: MosaicNode,
      second: MosaicNode,
      splitPercentage?: number,
    }
  | MosaicKey;

export type PanelConfig = { [key: string]: any };
export type PerPanelFunc<Config> = (Config) => Config;

export type PlaybackConfig = {
  speed: number,
  messageOrder: TimestampMethod,
  timeDisplayMethod: "ROS" | "TOD",
};

export type UserNode = { name: string, sourceCode: string };
export type UserNodes = { [nodeId: string]: UserNode };

// May want finer-grained controls in the future, currently just a boolean "suppress" condition.
// Unused, but should be used for intermediate states like during a panel move when the panel isn't
// present in the layout.
export type EditHistoryOptions = "SUPPRESS_HISTORY_ENTRY";

export type ConfigsPayload = {| id: string, override?: boolean, config: PanelConfig, defaultConfig?: PanelConfig |};
export type ChangePanelLayoutPayload = {|
  layout: ?MosaicNode,
  trimSavedProps?: boolean,
  historyOptions?: EditHistoryOptions,
|};
export type SaveConfigsPayload = {|
  // if you set override to true, existing config will be completely overriden by new passed in config
  configs: ConfigsPayload[],
  historyOptions?: EditHistoryOptions,
|};

export type SaveFullConfigPayload = {
  panelType: string,
  perPanelFunc: PerPanelFunc<any>,
  historyOptions?: EditHistoryOptions,
};

export type SavedProps = { [panelId: string]: PanelConfig };

export type CreateTabPanelPayload = {
  idToReplace: ?string,
  layout: MosaicNode,
  idsToRemove: string[],
  singleTab: boolean,
};

export type ImportPanelLayoutPayload = {
  // layout is the object passed to react-mosaic
  layout: ?MosaicNode,
  savedProps?: SavedProps,
  globalVariables?: GlobalVariables,
  userNodes?: UserNodes,
  linkedGlobalVariables?: LinkedGlobalVariables,
  skipSettingLocalStorage?: boolean,
};

export type LayoutFetchResult = {|
  content: PanelsState,
  name: string,
  savedBy: string,
  releasedVersion: number,
  fileSuffix?: string,
|};
export type LayoutUrl = {| layoutId: ?string, layoutUrl: ?string, patch: ?string |};
export type InitialLayoutFetchResult = {|
  layoutUrlReplacedByDefault?: ?LayoutUrl,
  // The layoutFetchResult will be null if there is no layout to load in the URL.
  layoutFetchResult: ?LayoutFetchResult,
|};
export type SetFetchedLayoutPayload = {
  isLoading: boolean,
  error?: Error,
  data?: LayoutFetchResult,
  isFromLayoutUrlParam?: boolean,
  isInitializedFromLocalStorage?: boolean,
  layoutUrlReplacedByDefault?: ?LayoutUrl,
};

export type SaveConfig<Config> = ($Shape<Config>, ?{| historyOptions?: EditHistoryOptions |}) => void;

export type UpdatePanelConfig<Config> = (
  panelType: string,
  perPanelFunc: PerPanelFunc<Config>,
  historyOptions?: EditHistoryOptions
) => void;

export type OpenSiblingPanel = (string, cb: (PanelConfig) => PanelConfig) => void;
