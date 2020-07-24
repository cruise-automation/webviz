// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { TimeUtil, type Time } from "rosbag";
import uuid from "uuid";

import type { Interactive } from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/types";
import type { BaseMarker } from "webviz-core/src/types/Messages";

const ZERO_TIME = { sec: 0, nsec: 0 };

// Not a concrete type, just descriptive.
type ObjectWithInteractionData = Interactive<any>;

class MessageWithLifetime {
  message: ObjectWithInteractionData;
  receiveTime: Time;
  // If lifetime is present and non-zero, the marker expires when the collector clock is greater
  // than receiveTime + lifetime.
  // If lifetime is zero, the marker remains until deleted by name.
  // If absent, the marker is removed from the collector using explicit "flush" actions.
  lifetime: ?Time;

  constructor(message: ObjectWithInteractionData, receiveTime: Time, lifetime: ?Time) {
    this.message = message;
    this.receiveTime = receiveTime;
    this.lifetime = lifetime;
  }

  // support in place update w/ mutation to avoid allocating
  // a MarkerWithLifetime wrapper for every marker on every tick
  // only allocate on new markers
  update(message: ObjectWithInteractionData, receiveTime: Time, lifetime: ?Time) {
    this.message = message;
    this.receiveTime = receiveTime;
    this.lifetime = lifetime;
  }

  isExpired(currentTime: Time) {
    // cannot tell if a marker is expired if we don't have a clock yet
    if (!currentTime) {
      return false;
    }
    if (this.lifetime == null) {
      // Do not expire markers if we can't tell what their lifetime is.
      // They'll be flushed later if needed (see flush below)
      return false;
    }
    const lifetime: Time = this.lifetime;

    if (TimeUtil.areSame(lifetime, ZERO_TIME)) {
      // Do not expire markers with infinite lifetime (lifetime == 0)
      return false;
    }

    // we use the receive time (clock) instead of the header stamp
    // to match the behavior of rviz
    const expiresAt = TimeUtil.add(this.receiveTime, lifetime);

    return TimeUtil.isGreaterThan(currentTime, expiresAt);
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
      this.flush();
    }
    this.clock = clock;
  }

  flush() {
    // clear out all null lifetime markers
    this.markers.forEach((marker, key) => {
      if (marker.lifetime == null) {
        this.markers.delete(key);
      }
    });
  }

  _addItem(key: string, item: ObjectWithInteractionData, lifetime: ?Time): void {
    const existing = this.markers.get(key);
    if (existing) {
      existing.update(item, this.clock, lifetime);
    } else {
      this.markers.set(key, new MessageWithLifetime(item, this.clock, lifetime));
    }
  }

  addMarker(marker: Interactive<BaseMarker>, name: string) {
    this._addItem(name, marker, marker.lifetime);
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

  addNonMarker(topic: string, message: ObjectWithInteractionData, lifetime: ?Time) {
    // Non-marker data is removed in two ways:
    //  - Messages with lifetimes expire only at the end of their lifetime. Multiple messages on the
    //    same topic are added and expired independently.
    //  - Messages without lifetimes overwrite others on the same topic -- there is at most one per
    //    topic at any time. These messages are also removed when `flush` is called.
    //
    // Topics are expected to have data in one of these two "modes" at a time.
    // Non-marker messages are not expected to have names, as they have no "delete" operation.

    if (lifetime != null) {
      // Assuming that all future messages will have a decay time set,
      // we need to immediately expire any pre-existing message that didn't have a decay time.
      this.markers.delete(topic);

      // Create a unique key for each new message.
      const key = `${topic}/${uuid.v4()}`;
      this._addItem(key, message, lifetime);
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

  getMessages(): ObjectWithInteractionData[] {
    const result = [];
    this.markers.forEach((marker, key) => {
      // Check if the marker has a lifetime and should be deleted
      if (marker.isExpired(this.clock)) {
        this.markers.delete(key);
      } else {
        result.push(marker.message);
      }
    });
    return result;
  }
}
