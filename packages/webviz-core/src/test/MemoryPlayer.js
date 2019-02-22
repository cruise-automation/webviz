// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { Time } from "rosbag";

import type {
  Player,
  PlayerMessage,
  SubscribePayload,
  AdvertisePayload,
  PublishPayload,
} from "webviz-core/src/types/players";

// mock player to use for testing
export default class MemoryPlayer implements Player {
  listener: ?(PlayerMessage) => Promise<void>;
  subscriptions: SubscribePayload[] = [];
  publishers: AdvertisePayload[] = [];
  closeCallback: ?(?Error) => void;

  setSubscriptions(subscriptions: SubscribePayload[]) {
    this.subscriptions = subscriptions;
  }

  setPublishers(publishers: AdvertisePayload[]) {
    this.publishers = publishers;
  }

  publish(payload: PublishPayload) {
    throw new Error("Publish not supported in tests");
  }

  requestMessages() {}

  // used to publish messages to the listener in tests
  async injectFakeMessage(message: PlayerMessage): Promise<void> {
    if (!this.listener) {
      throw new Error("No listener has been added");
    }
    return this.listener(message);
  }

  setListener(listener: (PlayerMessage) => Promise<void>): Promise<void> {
    this.listener = listener;
    return Promise.resolve();
  }

  async close() {
    // nothing to do
  }

  onAbort(callback: (?Error) => void) {
    // nothing to do
  }

  startPlayback() {}
  pausePlayback() {}
  setPlaybackSpeed(speed: number) {}
  seekPlayback(time: Time) {}
}
