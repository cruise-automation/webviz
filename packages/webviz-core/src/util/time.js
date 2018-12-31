// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import momentDurationFormatSetup from "moment-duration-format";
import moment from "moment-timezone";
import { Time } from "rosbag";

import type { Timestamp } from "webviz-core/src/types/dataSources";

type BatchTimestamp = {
  seconds: number,
  nanoseconds: number,
};

momentDurationFormatSetup(moment);

export function format(stamp: Timestamp) {
  return `${formatDate(stamp)} ${formatTime(stamp)}`;
}

export function formatDate(stamp: Timestamp) {
  if (stamp.sec < 0 || stamp.nsec < 0) {
    console.error("Times are not allowed to be negative");
    return "(invalid negative time)";
  }
  return moment.tz(toDate(stamp), moment.tz.guess()).format("YYYY-MM-DD");
}

export function formatTime(stamp: Timestamp) {
  if (stamp.sec < 0 || stamp.nsec < 0) {
    console.error("Times are not allowed to be negative");
    return "(invalid negative time)";
  }
  return moment.tz(toDate(stamp), moment.tz.guess()).format("h:mm:ss.SSS A z");
}

export function formatTimeRaw(stamp: Timestamp) {
  if (stamp.sec < 0 || stamp.nsec < 0) {
    console.error("Times are not allowed to be negative");
    return "(invalid negative time)";
  }
  return `${stamp.sec}.${stamp.nsec.toFixed().padStart(9, "0")}`;
}

const isNum = /^\d+$/;

// converts a string in nanoseconds to a time
// we use a string because nano-second precision cannot be stored
// in a JavaScript number for large nanoseconds (unix stamps)
export function fromNanosecondStamp(stamp: string): Timestamp {
  const hasSeconds = stamp.length > 9;
  const nanoString = hasSeconds ? stamp.substr(stamp.length - 9) : stamp;
  const secondString = hasSeconds ? stamp.substr(0, stamp.length - 9) : "0";
  if (!isNum.test(stamp)) {
    throw new Error(`Could not parse time from ${stamp}`);
  }
  const seconds = parseInt(secondString);
  const nanos = parseInt(nanoString);
  return new Time(seconds, nanos);
}

export function formatDuration(stamp: Timestamp) {
  return moment.duration(Math.round(stamp.sec * 1000 + stamp.nsec / 1e6)).format("h:mm:ss.SSS", { trim: false });
}

// note: sub-millisecond precision is lost
export function toDate(stamp: Timestamp): Date {
  const { sec, nsec } = stamp;
  return new Date(sec * 1000 + nsec / 1e6);
}

export function fromDate(date: Date): Timestamp {
  const millis = date.getTime();
  const remainder = millis % 1000;
  return { sec: Math.floor(millis / 1000), nsec: remainder * 1e6 };
}

// returns the percentage of target in the range between start & end
// e.g. start = { sec: 0 }, end = { sec: 10 }, target = { sec: 5 } = 50
export function percentOf(start: Time, end: Time, target: Time) {
  const totalDuration = subtractTimes(end, start);
  const targetDuration = subtractTimes(target, start);
  return (toSec(targetDuration) / toSec(totalDuration)) * 100;
}

export function subtractTimes({ sec: sec1, nsec: nsec1 }: Timestamp, { sec: sec2, nsec: nsec2 }: Timestamp): Timestamp {
  return { sec: sec1 - sec2, nsec: nsec1 - nsec2 };
}

export function toSec({ sec, nsec }: Timestamp) {
  return sec + nsec * 1e-9;
}

export function fromSec(value: number): Timestamp {
  // https://github.com/ros/roscpp_core/blob/indigo-devel/rostime/include/ros/time.h#L153
  let sec = Math.trunc(value);
  let nsec = Math.round((value - sec) * 1e9);
  sec += Math.trunc(nsec / 1e9);
  nsec %= 1e9;
  return { sec, nsec };
}

export function fromMillis(value: number): Timestamp {
  return fromSec(value / 1000);
}

export function findClosestTimestampIndex(currentTime: Timestamp, frameTimestamps: string[] = []): number {
  if (!frameTimestamps.length || Time.isLessThan(currentTime, fromNanosecondStamp(frameTimestamps[0]))) {
    return -1;
  }
  const { sec, nsec } = currentTime;
  const cTime = sec + nsec / 1e9;
  // find closest Timestamp from currentTime
  let min = Number.MAX_SAFE_INTEGER;
  let minIndex = 0;
  // TODO: Refactor to use binary search.
  frameTimestamps.forEach((tstamp, index) => {
    const diff = cTime - Number(tstamp) / 1e9;
    if (Math.abs(diff) < min) {
      min = Math.abs(diff);
      minIndex = index;
    }
  });
  return minIndex;
}

export function getNextFrame(effectiveFrameIndex: number, frameTimestamps: string[], modifier: number = 1): Timestamp {
  let newIndex = effectiveFrameIndex + modifier;
  if (newIndex >= frameTimestamps.length) {
    newIndex = newIndex - frameTimestamps.length;
  } else if (newIndex < 0) {
    newIndex = frameTimestamps.length + newIndex;
  }
  const nextFrame = frameTimestamps[newIndex];
  return fromNanosecondStamp(nextFrame);
}

export function formatFrame(timestamp: Timestamp): string {
  return timestamp.sec + String.prototype.padStart.call(timestamp.nsec, 9, "0");
}

export const transformBatchTimestamp = (batchTimestamp: BatchTimestamp): string => {
  const { seconds, nanoseconds } = batchTimestamp;
  return formatFrame({ sec: seconds, nsec: nanoseconds });
};
