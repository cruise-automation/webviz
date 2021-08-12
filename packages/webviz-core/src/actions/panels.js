// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import type { MosaicDropTargetPosition, MosaicPath } from "react-mosaic-component";

import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import { type LinkedGlobalVariables } from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/useLinkedGlobalVariables";
import type { Dispatcher } from "webviz-core/src/reducers";
import { type PanelsState } from "webviz-core/src/reducers/panels";
import type { TabLocation } from "webviz-core/src/types/layouts";
import type {
  CreateTabPanelPayload,
  ImportPanelLayoutPayload,
  ChangePanelLayoutPayload,
  SaveConfigsPayload,
  SaveFullConfigPayload,
  UserNodes,
  PlaybackConfig,
  MosaicNode,
  SavedProps,
  PanelConfig,
  SetFetchedLayoutPayload,
} from "webviz-core/src/types/panels";
import { LAYOUT_URL_QUERY_KEY, PATCH_QUERY_KEY } from "webviz-core/src/util/globalConstants";
import { applyPatchToLayout } from "webviz-core/src/util/layout/patch";

export const PANELS_ACTION_TYPES = {
  CHANGE_PANEL_LAYOUT: "CHANGE_PANEL_LAYOUT",
  IMPORT_PANEL_LAYOUT: "IMPORT_PANEL_LAYOUT",
  SAVE_PANEL_CONFIGS: "SAVE_PANEL_CONFIGS",
  SAVE_FULL_PANEL_CONFIG: "SAVE_FULL_PANEL_CONFIG",
  CREATE_TAB_PANEL: "CREATE_TAB_PANEL",
  OVERWRITE_GLOBAL_DATA: "OVERWRITE_GLOBAL_DATA",
  SET_GLOBAL_DATA: "SET_GLOBAL_DATA",
  SET_USER_NODES: "SET_USER_NODES",
  SET_LINKED_GLOBAL_VARIABLES: "SET_LINKED_GLOBAL_VARIABLES",
  SET_PLAYBACK_CONFIG: "SET_PLAYBACK_CONFIG",
  CLOSE_PANEL: "CLOSE_PANEL",
  SPLIT_PANEL: "SPLIT_PANEL",
  SWAP_PANEL: "SWAP_PANEL",
  MOVE_TAB: "MOVE_TAB",
  ADD_PANEL: "ADD_PANEL",
  DROP_PANEL: "DROP_PANEL",
  START_DRAG: "START_DRAG",
  END_DRAG: "END_DRAG",
  SET_FETCHED_LAYOUT: "SET_FETCHED_LAYOUT",
  SET_FETCH_LAYOUT_FAILED: "SET_FETCH_LAYOUT_FAILED",
  LOAD_LAYOUT: "LOAD_LAYOUT",
  CLEAR_LAYOUT_URL_REPLACED_BY_DEFAULT: "CLEAR_LAYOUT_URL_REPLACED_BY_DEFAULT",
  SET_FULL_SCREEN_PANEL: "SET_FULL_SCREEN_PANEL",
  CLEAR_FULL_SCREEN_PANEL: "CLEAR_FULL_SCREEN_PANEL",
};

export type SAVE_PANEL_CONFIGS = { type: "SAVE_PANEL_CONFIGS", payload: SaveConfigsPayload };
export type SAVE_FULL_PANEL_CONFIG = { type: "SAVE_FULL_PANEL_CONFIG", payload: SaveFullConfigPayload };
export type CREATE_TAB_PANEL = { type: "CREATE_TAB_PANEL", payload: CreateTabPanelPayload };
export type CHANGE_PANEL_LAYOUT = { type: "CHANGE_PANEL_LAYOUT", payload: ChangePanelLayoutPayload };
type LOAD_LAYOUT = { type: "LOAD_LAYOUT", payload: PanelsState };

type SET_FETCHED_LAYOUT = { type: "SET_FETCHED_LAYOUT", payload: SetFetchedLayoutPayload };
type SET_FETCH_LAYOUT_FAILED = { type: "SET_FETCH_LAYOUT_FAILED", payload: Error };
export const setFetchedLayout = (payload: SetFetchedLayoutPayload): Dispatcher<SET_FETCHED_LAYOUT> => (dispatch) => {
  return dispatch({ type: PANELS_ACTION_TYPES.SET_FETCHED_LAYOUT, payload });
};

export const savePanelConfigs = (payload: SaveConfigsPayload): Dispatcher<SAVE_PANEL_CONFIGS> => (dispatch) => {
  return dispatch({ type: PANELS_ACTION_TYPES.SAVE_PANEL_CONFIGS, payload });
};

export const saveFullPanelConfig = (payload: SaveFullConfigPayload): Dispatcher<SAVE_FULL_PANEL_CONFIG> => (
  dispatch
) => {
  return dispatch({ type: PANELS_ACTION_TYPES.SAVE_FULL_PANEL_CONFIG, payload });
};

export const createTabPanel = (payload: CreateTabPanelPayload): CREATE_TAB_PANEL => ({
  type: PANELS_ACTION_TYPES.CREATE_TAB_PANEL,
  payload,
});

type IMPORT_PANEL_LAYOUT = { type: "IMPORT_PANEL_LAYOUT", payload: ImportPanelLayoutPayload };
export const importPanelLayout = (
  payload: ImportPanelLayoutPayload,
  { skipSettingLocalStorage = false }: { skipSettingLocalStorage?: boolean } = {}
): Dispatcher<IMPORT_PANEL_LAYOUT> => (dispatch) => {
  return dispatch({
    type: PANELS_ACTION_TYPES.IMPORT_PANEL_LAYOUT,
    payload: skipSettingLocalStorage ? { ...payload, skipSettingLocalStorage } : payload,
  });
};

export const changePanelLayout = (payload: ChangePanelLayoutPayload): Dispatcher<CHANGE_PANEL_LAYOUT> => (dispatch) => {
  return dispatch({ type: PANELS_ACTION_TYPES.CHANGE_PANEL_LAYOUT, payload });
};

export const loadLayout = (layout: PanelsState): Dispatcher<LOAD_LAYOUT> => (dispatch) => {
  return dispatch({ type: PANELS_ACTION_TYPES.LOAD_LAYOUT, payload: layout });
};

type CLEAR_LAYOUT_URL_REPLACED_BY_DEFAULT = { type: "CLEAR_LAYOUT_URL_REPLACED_BY_DEFAULT" };
export const clearLayoutUrlReplacedByDefault = (): Dispatcher<CLEAR_LAYOUT_URL_REPLACED_BY_DEFAULT> => (dispatch) => {
  return dispatch({ type: PANELS_ACTION_TYPES.CLEAR_LAYOUT_URL_REPLACED_BY_DEFAULT });
};

export const fetchLayout = (search: string): Dispatcher<SET_FETCHED_LAYOUT> => (dispatch) => {
  const params = new URLSearchParams(search);
  const hasLayoutUrl = params.get(LAYOUT_URL_QUERY_KEY);
  const patch = params.get(PATCH_QUERY_KEY);
  dispatch({ type: PANELS_ACTION_TYPES.SET_FETCHED_LAYOUT, payload: { isLoading: true } });
  return getGlobalHooks()
    .getLayoutFromUrl(search)
    .then((layoutFetchResult) => {
      dispatch({
        type: PANELS_ACTION_TYPES.SET_FETCHED_LAYOUT,
        // Omitting `isInitializedFromLocalStorage` whenever we get a new fetched layout.
        payload: {
          isLoading: false,
          data: {
            ...layoutFetchResult,
            content: getGlobalHooks().migratePanels(layoutFetchResult.content || layoutFetchResult),
          },
          isFromLayoutUrlParam: !!hasLayoutUrl,
        },
      });
      if (layoutFetchResult) {
        if (hasLayoutUrl) {
          const patchedLayout = applyPatchToLayout(patch, layoutFetchResult.content || layoutFetchResult);
          dispatch({ type: PANELS_ACTION_TYPES.LOAD_LAYOUT, payload: patchedLayout });
        } else if (layoutFetchResult.content) {
          const patchedLayout = applyPatchToLayout(patch, layoutFetchResult.content);
          dispatch({
            type: PANELS_ACTION_TYPES.LOAD_LAYOUT,
            payload: patchedLayout,
          });
        }
      }
    })
    .catch((e) => {
      dispatch({ type: PANELS_ACTION_TYPES.SET_FETCH_LAYOUT_FAILED, payload: e });
    });
};

type OVERWRITE_GLOBAL_DATA = { type: "OVERWRITE_GLOBAL_DATA", payload: { [key: string]: any } };
export const overwriteGlobalVariables = (payload: { [key: string]: any }): OVERWRITE_GLOBAL_DATA => ({
  type: PANELS_ACTION_TYPES.OVERWRITE_GLOBAL_DATA,
  payload,
});

type SET_GLOBAL_DATA = { type: "SET_GLOBAL_DATA", payload: { [key: string]: any } };
export const setGlobalVariables = (payload: { [key: string]: any }): SET_GLOBAL_DATA => ({
  type: PANELS_ACTION_TYPES.SET_GLOBAL_DATA,
  payload,
});

type SET_WEBVIZ_NODES = { type: "SET_USER_NODES", payload: UserNodes };
export const setUserNodes = (payload: UserNodes): SET_WEBVIZ_NODES => ({
  type: PANELS_ACTION_TYPES.SET_USER_NODES,
  payload,
});

type SET_LINKED_GLOBAL_VARIABLES = { type: "SET_LINKED_GLOBAL_VARIABLES", payload: LinkedGlobalVariables };
export const setLinkedGlobalVariables = (payload: LinkedGlobalVariables): SET_LINKED_GLOBAL_VARIABLES => ({
  type: PANELS_ACTION_TYPES.SET_LINKED_GLOBAL_VARIABLES,
  payload,
});

type SET_PLAYBACK_CONFIG = { type: "SET_PLAYBACK_CONFIG", payload: $Shape<PlaybackConfig> };
export const setPlaybackConfig = (payload: $Shape<PlaybackConfig>): SET_PLAYBACK_CONFIG => ({
  type: PANELS_ACTION_TYPES.SET_PLAYBACK_CONFIG,
  payload,
});

type ClosePanelPayload = {|
  tabId?: string,
  root: MosaicNode,
  path: MosaicPath,
|};
type CLOSE_PANEL = { type: "CLOSE_PANEL", payload: ClosePanelPayload };
export const closePanel = (payload: ClosePanelPayload): CLOSE_PANEL => ({
  type: PANELS_ACTION_TYPES.CLOSE_PANEL,
  payload,
});

type SplitPanelPayload = {|
  tabId?: string,
  id: string,
  direction: "row" | "column",
  root: MosaicNode,
  path: MosaicPath,
  config: PanelConfig,
|};
type SPLIT_PANEL = { type: "SPLIT_PANEL", payload: SplitPanelPayload };
export const splitPanel = (payload: SplitPanelPayload): SPLIT_PANEL => ({
  type: PANELS_ACTION_TYPES.SPLIT_PANEL,
  payload,
});

type SwapPanelPayload = {|
  tabId?: string,
  originalId: string,
  type: string,
  root: MosaicNode,
  path: MosaicPath,
  config: PanelConfig,
  relatedConfigs?: SavedProps,
|};
type SWAP_PANEL = { type: "SWAP_PANEL", payload: SwapPanelPayload };
export const swapPanel = (payload: SwapPanelPayload): SWAP_PANEL => ({ type: PANELS_ACTION_TYPES.SWAP_PANEL, payload });

export type MoveTabPayload = {| source: TabLocation, target: TabLocation |};
type MOVE_TAB = { type: "MOVE_TAB", payload: MoveTabPayload };
export const moveTab = (payload: MoveTabPayload): MOVE_TAB => ({ type: PANELS_ACTION_TYPES.MOVE_TAB, payload });

export type AddPanelPayload = {|
  type: string,
  layout: ?MosaicNode,
  tabId: ?string,
  config?: PanelConfig,
  relatedConfigs?: SavedProps,
|};
type ADD_PANEL = { type: "ADD_PANEL", payload: AddPanelPayload };
export const addPanel = (payload: AddPanelPayload): ADD_PANEL => ({
  type: PANELS_ACTION_TYPES.ADD_PANEL,
  payload,
});

export type DropPanelPayload = {|
  newPanelType: string,
  destinationPath: MosaicPath,
  position: "top" | "bottom" | "left" | "right",
  tabId?: string,
  config: ?PanelConfig,
  relatedConfigs: ?SavedProps,
|};
type DROP_PANEL = { type: "DROP_PANEL", payload: DropPanelPayload };
export const dropPanel = (payload: DropPanelPayload): DROP_PANEL => ({
  type: PANELS_ACTION_TYPES.DROP_PANEL,
  payload,
});

export type StartDragPayload = {|
  path: MosaicPath,
  sourceTabId: ?string,
|};
type START_DRAG = { type: "START_DRAG", payload: StartDragPayload };
export const startDrag = (payload: StartDragPayload): START_DRAG => ({
  type: PANELS_ACTION_TYPES.START_DRAG,
  payload,
});

export type EndDragPayload = {|
  originalLayout: MosaicNode,
  originalSavedProps: SavedProps,
  panelId: string,
  sourceTabId: ?string,
  targetTabId: ?string,
  position: ?MosaicDropTargetPosition,
  destinationPath: ?MosaicPath,
  ownPath: MosaicPath,
|};
type END_DRAG = { type: "END_DRAG", payload: EndDragPayload };
export const endDrag = (payload: EndDragPayload): END_DRAG => ({
  type: PANELS_ACTION_TYPES.END_DRAG,
  payload,
});

export type SET_FULL_SCREEN_PANEL = $ReadOnly<{|
  type: "SET_FULL_SCREEN_PANEL",
  payload: $ReadOnly<{| panelId: string, locked: boolean |}>,
|}>;

export const setFullScreenPanel = (panelId: string, locked: boolean): SET_FULL_SCREEN_PANEL => ({
  type: "SET_FULL_SCREEN_PANEL",
  payload: { panelId, locked },
});

export type CLEAR_FULL_SCREEN_PANEL = $ReadOnly<{|
  type: "CLEAR_FULL_SCREEN_PANEL",
  // Provide panelId so panels don't clear each other's state by mistake. If we ever want to clear
  // the fullscreen state regardless of who set it, we could make the id optional, or make a new
  // action.
  payload: $ReadOnly<{| panelId: string |}>,
|}>;

export const clearFullScreenPanel = (panelId: string): CLEAR_FULL_SCREEN_PANEL => ({
  type: "CLEAR_FULL_SCREEN_PANEL",
  payload: { panelId },
});

export type PanelsActions =
  | CHANGE_PANEL_LAYOUT
  | IMPORT_PANEL_LAYOUT
  | SAVE_PANEL_CONFIGS
  | SAVE_FULL_PANEL_CONFIG
  | CREATE_TAB_PANEL
  | OVERWRITE_GLOBAL_DATA
  | SET_GLOBAL_DATA
  | SET_WEBVIZ_NODES
  | SET_LINKED_GLOBAL_VARIABLES
  | SET_PLAYBACK_CONFIG
  | CLOSE_PANEL
  | SPLIT_PANEL
  | SWAP_PANEL
  | MOVE_TAB
  | ADD_PANEL
  | DROP_PANEL
  | START_DRAG
  | END_DRAG
  | SET_FETCHED_LAYOUT
  | SET_FETCH_LAYOUT_FAILED
  | LOAD_LAYOUT
  | CLEAR_LAYOUT_URL_REPLACED_BY_DEFAULT
  | SET_FULL_SCREEN_PANEL
  | CLEAR_FULL_SCREEN_PANEL;

type PanelsActionTypes = $Values<typeof PANELS_ACTION_TYPES>;
export const panelEditingActions = new Set<PanelsActionTypes>(Object.keys(PANELS_ACTION_TYPES));
