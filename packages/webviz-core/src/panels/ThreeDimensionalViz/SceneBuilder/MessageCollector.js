// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { TimeUtil, type Time } from "rosbag";

import type { BaseMarker, StampedMessage } from "webviz-core/src/types/Messages";

const ZERO_TIME = { sec: 0, nsec: 0 };

class MessageWithLifetime {
  message: StampedMessage;
  receiveTime: Time;

  constructor(message: StampedMessage, receiveTime: Time) {
    this.message = message;
    this.receiveTime = receiveTime;
  }

  // support in place update w/ mutation to avoid allocating
  // a MarkerWithLifetime wrapper for every marker on every tick
  // only allocate on new markers
  update(message: StampedMessage, receiveTime: Time) {
    this.message = message;
    this.receiveTime = receiveTime;
  }

  isExpired(currentTime: Time) {
    // cannot tell if a marker is expired if we don't have a clock yet
    if (!currentTime) {
      return false;
    }
    const lifetime = this.getLifetime();

    // we use the receive time (clock) instead of the header stamp
    // to match the behavior of rviz
    const expiresAt = TimeUtil.add(this.receiveTime, lifetime);

    return TimeUtil.isGreaterThan(currentTime, expiresAt);
  }

  getLifetime() {
    const marker = ((this.message: any): BaseMarker);
    return marker.lifetime || ZERO_TIME;
  }

  hasLifetime() {
    return !TimeUtil.areSame(this.getLifetime(), ZERO_TIME);
  }
}

// used to collect marker and non-marker visualization messages
// for a given topic and ensure the lifecycle is managed properly
export default class MessageCollector {
  markers: Map<string, MessageWithLifetime> = new Map();
  clock: Time = { sec: 0, nsec: 0 };

  setClock(clock: Time) {
    if (!clock) {
      return;
    }

    const clockMovedBackwards = TimeUtil.isGreaterThan(this.clock, clock);

    if (clockMovedBackwards) {
      this.markers.forEach((marker, key) => {
        const markerReceivedAfterClock = TimeUtil.isGreaterThan(marker.receiveTime, clock);
        if (markerReceivedAfterClock) {
          this.markers.delete(key);
        }
      });
    }
    this.clock = clock;
  }

  flush() {
    // clear out all 0 lifetime markers
    this.markers.forEach((marker, key) => {
      if (!marker.hasLifetime()) {
        this.markers.delete(key);
      }
    });
  }

  _addItem(key: string, item: any): void {
    const existing = this.markers.get(key);
    if (existing) {
      existing.update(item, this.clock);
    } else {
      this.markers.set(key, new MessageWithLifetime(item, this.clock));
    }
  }

  addMarker(topic: string, marker: BaseMarker) {
    const { name } = marker;
    if (!name) {
      return console.error("Cannot add marker, it is missing name", marker);
    }
    this._addItem(name, marker);
  }

  deleteMarker(name: string) {
    if (!name) {
      return console.error("Cannot delete marker, it is missing name");
    }
    this.markers.delete(name);
  }

  deleteAll() {
    this.markers.clear();
  }

  addMessage(topic: string, message: any) {
    if (message.lifetime) {
      // Assuming that all future messages will have a decay time set,
      // we need to immediately expire any pre-existing message that didn't have a decay time.
      this.markers.delete(topic);

      // Note: messages with same timestamp will override each other, but this is probably very uncommon
      const key = `${topic}/${this.clock.sec}/${this.clock.nsec}`;
      this._addItem(key, message);
    } else {
      // if future messages will not have a decay time set,
      // we should expire any pre-existing message that have potentially longer decay times.
      for (const key of this.markers.keys()) {
        if (key.indexOf(`${topic}/`) === 0) {
          this.markers.delete(key);
        }
      }
      this._addItem(topic, message);
    }
  }

  getMessages(): any[] {
    const result = [];
    this.markers.forEach((marker, key) => {
      if (marker.hasLifetime() && marker.isExpired(this.clock)) {
        this.markers.delete(key);
      } else {
        result.push(marker.message);
      }
    });
    return result;
  }
}
