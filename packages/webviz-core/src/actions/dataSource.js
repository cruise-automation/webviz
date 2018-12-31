// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import Pipeline from "webviz-core/src/pipeline/Pipeline";
import type {
  Timestamp,
  DataSource,
  SubscribePayload,
  AdvertisePayload,
  PublishPayload,
  DATA_SOURCE_CONNECTING,
  DATA_SOURCE_DISCONNECTED,
  DATA_SOURCE_CONNECTED,
  SET_WEBSOCKET_INPUT,
  PlayerState,
  Topic,
  Frame,
  TOPICS_RECEIVED,
  DATATYPES_RECEIVED,
  FRAME_RECEIVED,
  TIME_UPDATED,
  PLAYER_STATE_CHANGED,
  CAPABILITIES_RECEIVED,
  SUBSCRIPTIONS_CHANGED,
  PUBLISHERS_CHANGED,
} from "webviz-core/src/types/dataSources";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";

// sets the text for the websocket input
export const setWebsocketInput = (text: string): SET_WEBSOCKET_INPUT => {
  return {
    type: "SET_WEBSOCKET_INPUT",
    payload: text,
  };
};

export const topicsReceived = (topics: Topic[]): TOPICS_RECEIVED => ({
  type: "TOPICS_RECEIVED",
  payload: topics,
});

export const datatypesReceived = (datatypes: RosDatatypes): DATATYPES_RECEIVED => ({
  type: "DATATYPES_RECEIVED",
  payload: datatypes,
});

export const frameReceived = (frame: Frame, currentTime: ?Timestamp): FRAME_RECEIVED => ({
  type: "FRAME_RECEIVED",
  frame,
  currentTime,
});

export const timeUpdated = (time: Timestamp): TIME_UPDATED => ({
  type: "TIME_UPDATED",
  time,
});

export const playerStateChanged = (payload: PlayerState): PLAYER_STATE_CHANGED => {
  return {
    type: "PLAYER_STATE_CHANGED",
    payload,
  };
};

export const capabilitiesReceived = (capabilities: string[]): CAPABILITIES_RECEIVED => ({
  type: "CAPABILITIES_RECEIVED",
  capabilities,
});

// right now we support 1 active data source at a time
// so using a singleton is okay
let dataSource: ?DataSource;

export function getDataSource() {
  return dataSource;
}

export function setDataSourceNull() {
  dataSource = null;
}

// There's a circular dependency in tests, which causes `Pipeline` to be undefined
// while loading sometimes.
let pipeline;
if (Pipeline) {
  pipeline = new Pipeline();
}

export function getPipeline() {
  return pipeline;
}

type NOOP = {| type: "NOOP" |};

export const dataSourceConnecting = (ds: DataSource): DATA_SOURCE_CONNECTING => {
  dataSource = ds;
  return {
    type: "DATA_SOURCE_CONNECTING",
  };
};

export const dataSourceConnected = (): DATA_SOURCE_CONNECTED => ({
  type: "DATA_SOURCE_CONNECTED",
});

export const dataSourceDisconnected = (): DATA_SOURCE_DISCONNECTED => ({
  type: "DATA_SOURCE_DISCONNECTED",
});

export const subscribe = (payload: SubscribePayload): SUBSCRIPTIONS_CHANGED => {
  pipeline.subscribe(payload);
  return {
    type: "SUBSCRIPTIONS_CHANGED",
    subscriptions: pipeline.getAllSubscriptions(),
  };
};

export const unsubscribe = (payload: SubscribePayload): SUBSCRIPTIONS_CHANGED => {
  pipeline.unsubscribe(payload);
  return {
    type: "SUBSCRIPTIONS_CHANGED",
    subscriptions: pipeline.getAllSubscriptions(),
  };
};

export const advertise = (payload: AdvertisePayload): PUBLISHERS_CHANGED => {
  pipeline.advertise(payload);
  return {
    type: "PUBLISHERS_CHANGED",
    publishers: pipeline.getAllExternalPublishers(),
  };
};

export const unadvertise = (payload: AdvertisePayload): PUBLISHERS_CHANGED => {
  pipeline.unadvertise(payload);
  return {
    type: "PUBLISHERS_CHANGED",
    publishers: pipeline.getAllExternalPublishers(),
  };
};

export const publish = (payload: PublishPayload): NOOP => {
  pipeline.publish(payload);
  return { type: "NOOP" };
};

export const startPlayback = () => async () => {
  if (dataSource) {
    dataSource.startPlayback();
  }
};

export const pausePlayback = () => async () => {
  if (dataSource) {
    dataSource.pausePlayback();
  }
};

export const seekPlayback = (time: Timestamp) => (dispatch: any) => {
  if (dataSource) {
    dataSource.seekPlayback(time);
  }
};

export const setPlaybackSpeed = (speed: number) => async () => {
  if (dataSource) {
    dataSource.setPlaybackSpeed(speed);
  }
};

export type SET_AUXILIARY_DATA = {
  type: "SET_AUXILIARY_DATA",
  payload: (Object) => Object,
};

export const setAuxiliaryData = (payload: (Object) => Object): SET_AUXILIARY_DATA => ({
  type: "SET_AUXILIARY_DATA",
  payload,
});

export const setReconnectDelay = (timeout: number) => {
  return {
    type: "SET_RECONNECT_DELAY",
    payload: timeout,
  };
};
