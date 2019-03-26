// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import type {
  PlayerStateActiveData,
  PlayerState,
  Player,
  SubscribePayload,
  AdvertisePayload,
} from "webviz-core/src/types/players";

export default class FakePlayer implements Player {
  listener: (PlayerState) => Promise<void>;
  playerId: string = "test";
  subscriptions: ?(SubscribePayload[]);
  publishers: ?(AdvertisePayload[]);

  setListener(listener: (PlayerState) => Promise<void>): void {
    this.listener = listener;
  }

  emit(activeData?: PlayerStateActiveData): Promise<void> {
    return this.listener({
      playerId: this.playerId,
      isPresent: true,
      showSpinner: false,
      showInitializing: false,
      capabilities: [],
      progress: {},
      activeData,
    });
  }

  close() {}
  setPlaybackSpeed() {}
  pausePlayback() {}
  publish() {}
  setPublishers(pubs: AdvertisePayload[]) {
    this.publishers = pubs;
  }
  setSubscriptions(subs: SubscribePayload[]) {
    this.subscriptions = subs;
  }
  startPlayback() {}
  seekPlayback() {}
}
