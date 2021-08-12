// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { partition, uniq } from "lodash";
import { type Time, TimeUtil } from "rosbag";

import { type GlobalVariables } from "webviz-core/src/hooks/useGlobalVariables";
import {
  cast,
  type AdvertisePayload,
  type BobjectMessage,
  type Message,
  type PublishPayload,
  type SubscribePayload,
  type Player,
  type PlayerState,
  type PlayerWarnings,
} from "webviz-core/src/players/types";
import UserNodePlayer from "webviz-core/src/players/UserNodePlayer";
import type { BinaryStampedMessage } from "webviz-core/src/types/BinaryMessages";
import type { UserNodes } from "webviz-core/src/types/panels";
import { deepParse, maybeGetBobjectHeaderStamp, compareBinaryTimes } from "webviz-core/src/util/binaryObjects";
import { clampTime, isTime, type TimestampMethod } from "webviz-core/src/util/time";

// As a compromise between playback buffering required and correctness (as well as our ability to
// play near the ends of bags), we assume messages' headers are always between 0s and 1s earlier
// than their receive times.
export const BUFFER_DURATION_SECS = 1.0;

export default class OrderedStampPlayer implements Player {
  _player: UserNodePlayer;
  _messageOrder: TimestampMethod;
  // When messageOrder is "headerStamp", contains buffered, unsorted messages with receiveTime "in
  // the near future". Only messages with headers are stored.
  _messageBuffer: Message[] = [];
  _bobjectBuffer: BobjectMessage[] = [];
  // Used to invalidate the cache. (Also signals subscription changes etc).
  _lastSeekId: ?number = undefined;
  // Our best guess of "now" in case we need to force a backfill.
  _currentTime: ?Time = undefined;
  _previousUpstreamWarnings: ?PlayerWarnings = undefined;
  _warnings: PlayerWarnings = Object.freeze({});
  _topicsWithoutHeadersSinceSeek = new Set<string>();

  constructor(player: UserNodePlayer, messageOrder: TimestampMethod) {
    this._player = player;
    this._messageOrder = messageOrder;
  }

  setListener(listener: (PlayerState) => Promise<void>) {
    this._player.setListener((state: PlayerState) => {
      const { activeData } = state;
      if (!activeData) {
        // No new messages since last time.
        return listener(state);
      }
      if (this._messageOrder === "receiveTime") {
        // Set "now" to seek to in case messageOrder changes.
        this._currentTime = activeData.currentTime;
        return listener(state);
      }

      if (activeData.lastSeekTime !== this._lastSeekId) {
        this._bobjectBuffer = [];
        this._messageBuffer = [];
        this._lastSeekId = activeData.lastSeekTime;
        this._topicsWithoutHeadersSinceSeek = new Set<string>();
      }

      // Only store messages with a header stamp.
      const [newMessagesWithHeaders, newMessagesWithoutHeaders] = partition(activeData.messages, (message) =>
        isTime(message.message.header?.stamp)
      );
      const [newBobjectsWithHeaders, newBobjectsWithoutHeaders] = partition(activeData.bobjects, ({ message }) =>
        maybeGetBobjectHeaderStamp(message)
      );
      let newMissingTopic = false;
      newMessagesWithoutHeaders.concat(newBobjectsWithoutHeaders).forEach(({ topic }) => {
        if (!this._topicsWithoutHeadersSinceSeek.has(topic)) {
          newMissingTopic = true;
          this._topicsWithoutHeadersSinceSeek.add(topic);
        }
      });
      if (newMissingTopic || activeData.playerWarnings !== this._previousUpstreamWarnings) {
        this._previousUpstreamWarnings = activeData.playerWarnings;
        this._warnings = {
          ...activeData.playerWarnings,
          topicsWithoutHeaderStamps: uniq([
            ...(activeData.playerWarnings.topicsWithoutHeaderStamps || []),
            ...this._topicsWithoutHeadersSinceSeek,
          ]),
        };
      }

      const extendedMessageBuffer = this._messageBuffer.concat(newMessagesWithHeaders);
      const extendedBobjectBuffer = this._bobjectBuffer.concat(newBobjectsWithHeaders);
      // output messages older than this threshold (ie, send all messages up until the threshold
      // time)
      const thresholdTime = {
        sec: activeData.currentTime.sec - BUFFER_DURATION_SECS,
        nsec: activeData.currentTime.nsec,
      };
      const [messages, newMessageBuffer] = partition(
        extendedMessageBuffer,
        (message) => !TimeUtil.isGreaterThan(message.message.header.stamp, thresholdTime)
      );
      const [bobjects, newBobjectBuffer] = partition(extendedBobjectBuffer, (message) => {
        const stampedMessage = cast<BinaryStampedMessage>(message.message);
        return !TimeUtil.isGreaterThan(deepParse(stampedMessage.header().stamp()), thresholdTime);
      });
      this._messageBuffer = newMessageBuffer;
      this._bobjectBuffer = newBobjectBuffer;

      messages.sort((a, b) => TimeUtil.compare(a.message.header.stamp, b.message.header.stamp));
      bobjects.sort((a, b) => {
        const stampedA = cast<BinaryStampedMessage>(a.message);
        const stampedB = cast<BinaryStampedMessage>(b.message);
        return compareBinaryTimes(stampedA.header().stamp(), stampedB.header().stamp());
      });
      const currentTime = clampTime(thresholdTime, activeData.startTime, activeData.endTime);
      this._currentTime = currentTime;
      return listener({
        ...state,
        activeData: {
          ...activeData,
          messages,
          bobjects,
          messageOrder: "headerStamp",
          currentTime,
          endTime: clampTime(
            { sec: activeData.endTime.sec - BUFFER_DURATION_SECS, nsec: activeData.endTime.nsec },
            activeData.startTime,
            activeData.endTime
          ),
          playerWarnings: this._warnings,
        },
      });
    });
  }

  setSubscriptions = (subscriptions: SubscribePayload[]) => this._player.setSubscriptions(subscriptions);
  close = () => this._player.close();
  setPublishers = (publishers: AdvertisePayload[]) => this._player.setPublishers(publishers);
  publish = (request: PublishPayload) => this._player.publish(request);
  startPlayback = () => this._player.startPlayback();
  pausePlayback = () => this._player.pausePlayback();
  setPlaybackSpeed = (speed: number) => this._player.setPlaybackSpeed(speed);
  seekPlayback = (time: Time, backfillDuration: ?Time) => {
    // Add a second to the backfill duration requested downstream, to give us extra data to reorder.
    if (this._messageOrder === "receiveTime") {
      return this._player.seekPlayback(time, backfillDuration);
    }
    if (backfillDuration) {
      throw new Error("BackfillDuration not supported by OrderedStampPlayer.");
    }
    // Seek ahead of where we're interested in. If we want to seek to 10s, we want to backfill
    // messages with receive times between 10s and 11s.
    // Add backfilling for our translation buffer.
    const seekLocation = TimeUtil.add(time, { sec: BUFFER_DURATION_SECS, nsec: 0 });
    this._player.seekPlayback(seekLocation, { sec: BUFFER_DURATION_SECS, nsec: 0 });
  };
  requestBackfill() {
    if (!this._currentTime || this._messageOrder === "receiveTime") {
      return this._player.requestBackfill();
    }

    // If we are sorting messages by header stamps, let seekPlayback
    // handle the backfill since it takes care of fetching extra messages.
    // Note: This has the possibility to cause a seek during playback.
    // Ideally we would only seek if the player is paused, but the OrderedStampPlayer
    // does not have easy access to that state without tracking it itself.
    // This shouldn't matter in practice because the next emit() will
    // populate the panels regardless of requestBackfill() getting called.
    this.seekPlayback(this._currentTime);
  }
  setUserNodes(nodes: UserNodes): Promise<void> {
    return this._player.setUserNodes(nodes);
  }
  setGlobalVariables(globalVariables: GlobalVariables) {
    this._player.setGlobalVariables(globalVariables);
    // So that downstream players can re-send messages that depend on global
    // variable state.
    this.requestBackfill();
  }
  setMessageOrder(order: TimestampMethod) {
    if (this._messageOrder !== order) {
      this._messageOrder = order;
      // Seek to invalidate the cache. Don't just requestBackfill(), because it needs to work while
      // we're playing too.
      if (this._currentTime) {
        // Cache invalidation will be handled inside the seek/playback logic.
        this.seekPlayback(this._currentTime);
      }
    }
    this._player.setMessageOrder(order);
  }
}
