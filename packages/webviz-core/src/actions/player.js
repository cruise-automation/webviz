// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { Time } from "rosbag";

import Pipeline from "webviz-core/src/pipeline/Pipeline";
import type {
  Player,
  SubscribePayload,
  AdvertisePayload,
  PublishPayload,
  PLAYER_CONNECTING,
  PLAYER_DISCONNECTED,
  PLAYER_CONNECTED,
  SET_WEBSOCKET_INPUT,
  PlayerStatePayload,
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
} from "webviz-core/src/types/players";
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

export const frameReceived = (frame: Frame, currentTime: ?Time): FRAME_RECEIVED => ({
  type: "FRAME_RECEIVED",
  frame,
  currentTime,
});

export const timeUpdated = (time: Time): TIME_UPDATED => ({
  type: "TIME_UPDATED",
  time,
});

export const playerStateChanged = (payload: PlayerStatePayload): PLAYER_STATE_CHANGED => {
  return {
    type: "PLAYER_STATE_CHANGED",
    payload,
  };
};

export const capabilitiesReceived = (capabilities: string[]): CAPABILITIES_RECEIVED => ({
  type: "CAPABILITIES_RECEIVED",
  capabilities,
});

// right now we support 1 active player at a time
// so using a singleton is okay
let player: ?Player;

export function getPlayer() {
  return player;
}

export function setPlayerNull() {
  player = null;
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

export const playerConnecting = (ds: Player): PLAYER_CONNECTING => {
  player = ds;
  return {
    type: "PLAYER_CONNECTING",
  };
};

export const playerConnected = (): PLAYER_CONNECTED => ({
  type: "PLAYER_CONNECTED",
});

export const playerDisconnected = (): PLAYER_DISCONNECTED => ({
  type: "PLAYER_DISCONNECTED",
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
  if (player) {
    player.startPlayback();
  }
};

export const pausePlayback = () => async () => {
  if (player) {
    player.pausePlayback();
  }
};

export const seekPlayback = (time: Time) => (dispatch: any) => {
  if (player) {
    player.seekPlayback(time);
  }
};

export const setPlaybackSpeed = (speed: number) => async () => {
  if (player) {
    player.setPlaybackSpeed(speed);
  }
};

export const setReconnectDelay = (timeout: number) => {
  return {
    type: "SET_RECONNECT_DELAY",
    payload: timeout,
  };
};
