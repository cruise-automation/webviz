// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { ActionTypes } from "webviz-core/src/actions";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import type {
  Frame,
  Topic,
  Timestamp,
  SubscribePayload,
  AdvertisePayload,
  Progress,
} from "webviz-core/src/types/dataSources";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";
import { SOCKET_KEY } from "webviz-core/src/util/globalConstants";
import naturalSort from "webviz-core/src/util/naturalSort";
import Storage from "webviz-core/src/util/Storage";

export const DataSourceCapabilities = {
  advertise: "advertise",
  seekBackfill: "seekBackfill",
  initialization: "initialization",
};

let dataSourceId = 1;

export type DataSourceState = {|
  id: number,
  isLive: boolean,
  isConnecting: boolean,
  reconnectDelayMillis: number,
  websocket: string,
  frame: Frame,
  topics: Topic[],
  startTime?: Timestamp,
  endTime?: Timestamp,
  currentTime: ?Timestamp,
  isPlaying: boolean,
  speed: ?number,
  auxiliaryData: Object,
  lastSeekTime: number,
  capabilities: string[],
  datatypes: RosDatatypes,
  subscriptions: SubscribePayload[],
  publishers: AdvertisePayload[],
  progress: Progress,
|};

const defaultState: DataSourceState = {
  id: dataSourceId,
  isLive: false,
  isConnecting: false,
  reconnectDelayMillis: 0,
  websocket: getGlobalHooks().initialWebsocketInputValue(),
  topics: [],
  frame: {},
  isPlaying: false,
  speed: undefined,
  startTime: undefined,
  endTime: undefined,
  currentTime: undefined,
  auxiliaryData: {
    timestamps: [],
  },
  lastSeekTime: 0,
  capabilities: [],
  datatypes: {},
  subscriptions: [],
  publishers: [],
  progress: {},
};

export default function dataSourceReducer(state: DataSourceState = defaultState, action: ActionTypes): DataSourceState {
  switch (action.type) {
    case "SUBSCRIPTIONS_CHANGED":
      return { ...state, subscriptions: action.subscriptions };
    case "PUBLISHERS_CHANGED":
      return { ...state, publishers: action.publishers };
    case "SET_WEBSOCKET_INPUT":
      new Storage().set(SOCKET_KEY, action.payload);
      return { ...state, websocket: action.payload };

    case "FRAME_RECEIVED": {
      const newState = { ...state, frame: action.frame };
      if (action.currentTime) {
        newState.currentTime = action.currentTime;
      }
      return newState;
    }

    case "TIME_UPDATED":
      return { ...state, currentTime: action.time };

    case "DATA_SOURCE_CONNECTING":
      return {
        ...state,
        id: dataSourceId++,
        isConnecting: true,
        isLive: false,
        // Don't clear out too much, because we immediately reconnect when losing the Websocket
        // connection, and we want the panels to keep showing what they showed before until we
        // reconnect.
      };

    case "DATA_SOURCE_CONNECTED":
      return {
        ...state,
        isConnecting: false,
        isLive: true,
        topics: [],
        frame: {},
        lastSeekTime: Date.now(),
        // Don't clear out datatypes, as we receive those only once before DATA_SOURCE_CONNECTED.
      };

    case "DATA_SOURCE_DISCONNECTED":
      return {
        ...state,
        isConnecting: false,
        isLive: false,
        // Don't clear out too much so that panels still work as before.
      };

    case "TOPICS_RECEIVED":
      return { ...state, topics: action.payload.sort(naturalSort("name")) };

    case "DATATYPES_RECEIVED":
      return { ...state, datatypes: action.payload };

    case "SET_RECONNECT_DELAY":
      return { ...state, reconnectDelayMillis: action.payload };

    case "PLAYER_STATE_CHANGED":
      return { ...state, ...action.payload };

    case "DATA_SOURCE_PROGRESS":
      return { ...state, progress: { ...action.payload } };

    case "SET_AUXILIARY_DATA":
      return {
        ...state,
        auxiliaryData: { ...state.auxiliaryData, ...action.payload(state.auxiliaryData) },
      };
    case "PLAYBACK_RESET":
      return { ...state, frame: {}, lastSeekTime: Date.now() };
    case "CAPABILITIES_RECEIVED":
      return { ...state, capabilities: action.capabilities };
  }

  return state;
}
