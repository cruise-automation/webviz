// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { isEqual } from "lodash";

import type {
  DataSource,
  DataSourceMessage,
  Timestamp,
  SubscribePayload,
  AdvertisePayload,
  PublishPayload,
} from "webviz-core/src/types/dataSources";

// mock datasource to use for testing
export default class MemoryDatasource implements DataSource {
  listener: ?(DataSourceMessage) => Promise<void>;
  subscriptions: SubscribePayload[] = [];
  publishers: AdvertisePayload[] = [];
  closeCallback: ?(?Error) => void;

  subscribe(request: SubscribePayload) {
    if (this.subscriptions.find((sub) => isEqual(sub, request))) {
      throw new Error("Cannot subscribe to the same topic twice");
    }
    this.subscriptions.push(request);
  }

  unsubscribe(request: SubscribePayload) {
    const newSubscriptions = this.subscriptions.filter((sub) => !isEqual(sub, request));
    if (newSubscriptions.length !== this.subscriptions.length - 1) {
      throw new Error("Unable to unsubscribe only once to topic");
    }
    this.subscriptions = newSubscriptions;
  }

  advertise(request: AdvertisePayload) {
    if (this.publishers.find((pub) => isEqual(pub, request))) {
      throw new Error("Cannot subscribe to the same topic twice");
    }
    this.publishers.push(request);
  }
  unadvertise(request: AdvertisePayload) {
    const newPublishers = this.publishers.filter((sub) => !isEqual(sub, request));
    if (newPublishers.length !== this.publishers.length - 1) {
      throw new Error("Unable to unsubscribe only once to topic");
    }
    this.publishers = newPublishers;
  }

  publish(payload: PublishPayload) {
    throw new Error("Publish not supported in tests");
  }

  requestTopics() {}

  requestMessages() {}

  // used to publish messages to the listener in tests
  async injectFakeMessage(message: DataSourceMessage): Promise<void> {
    if (!this.listener) {
      throw new Error("No listener has been added");
    }
    return this.listener(message);
  }

  setListener(listener: (DataSourceMessage) => Promise<void>): Promise<void> {
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
  seekPlayback(time: Timestamp) {}
}
