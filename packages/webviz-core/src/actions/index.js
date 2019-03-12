// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { ExtensionAction, SET_AUXILIARY_DATA } from "./extensions";
import type { SET_MOSAIC_ID } from "./mosaic";
import type { CHANGE_PANEL_LAYOUT, IMPORT_PANEL_LAYOUT, SAVE_PANEL_CONFIG } from "./panels";
import type {
  SUBSCRIPTIONS_CHANGED,
  PUBLISHERS_CHANGED,
  PLAYER_CONNECTING,
  PLAYER_CONNECTED,
  PLAYER_DISCONNECTED,
  TOPICS_RECEIVED,
  FRAME_RECEIVED,
  TIME_UPDATED,
  PLAYER_STATE_CHANGED,
  SET_RECONNECT_DELAY,
  SET_WEBSOCKET_INPUT,
  SEEK_PLAYBACK,
  PLAYBACK_RESET,
  CAPABILITIES_RECEIVED,
  DATATYPES_RECEIVED,
  PLAYER_PROGRESS,
} from "webviz-core/src/types/players";

export type ActionTypes =
  | CHANGE_PANEL_LAYOUT
  | IMPORT_PANEL_LAYOUT
  | SAVE_PANEL_CONFIG
  | SET_MOSAIC_ID
  | SUBSCRIPTIONS_CHANGED
  | PUBLISHERS_CHANGED
  | PLAYER_CONNECTING
  | PLAYER_CONNECTED
  | PLAYER_DISCONNECTED
  | TOPICS_RECEIVED
  | DATATYPES_RECEIVED
  | FRAME_RECEIVED
  | TIME_UPDATED
  | PLAYER_STATE_CHANGED
  | SET_RECONNECT_DELAY
  | SET_AUXILIARY_DATA
  | SET_WEBSOCKET_INPUT
  | SEEK_PLAYBACK
  | PLAYBACK_RESET
  | ExtensionAction
  | CAPABILITIES_RECEIVED
  | PLAYER_PROGRESS;
