// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import momentDurationFormatSetup from "moment-duration-format";
import moment from "moment-timezone";
import { type Time } from "rosbag";

type BatchTimestamp = {
  seconds: number,
  nanoseconds: number,
};

momentDurationFormatSetup(moment);

export function format(stamp: Time) {
  return `${formatDate(stamp)} ${formatTime(stamp)}`;
}

export function formatDate(stamp: Time) {
  if (stamp.sec < 0 || stamp.nsec < 0) {
    console.error("Times are not allowed to be negative");
    return "(invalid negative time)";
  }
  return moment.tz(toDate(stamp), moment.tz.guess()).format("YYYY-MM-DD");
}

export function formatTime(stamp: Time) {
  if (stamp.sec < 0 || stamp.nsec < 0) {
    console.error("Times are not allowed to be negative");
    return "(invalid negative time)";
  }
  return moment.tz(toDate(stamp), moment.tz.guess()).format("h:mm:ss.SSS A z");
}

export function formatTimeRaw(stamp: Time) {
  if (stamp.sec < 0 || stamp.nsec < 0) {
    console.error("Times are not allowed to be negative");
    return "(invalid negative time)";
  }
  return `${stamp.sec}.${stamp.nsec.toFixed().padStart(9, "0")}`;
}

const isNum = /^\d+\.?\d*$/;

// converts a string in Seconds to a time
// we use a string because nano-second precision cannot be stored
// in a JavaScript number for large nanoseconds (unix stamps)
export function fromSecondStamp(stamp: string): Time {
  if (!isNum.test(stamp)) {
    throw new Error(`Could not parse time from ${stamp}`);
  }
  const [secondString = "0", nanoString = "0"] = stamp.split(".");
  const nanosecond = nanoString.length <= 9 ? nanoString.padEnd(9, "0") : nanoString.slice(0, 9);

  return { sec: parseInt(secondString), nsec: parseInt(nanosecond) };
}

export function formatDuration(stamp: Time) {
  return moment.duration(Math.round(stamp.sec * 1000 + stamp.nsec / 1e6)).format("h:mm:ss.SSS", { trim: false });
}

// note: sub-millisecond precision is lost
export function toDate(stamp: Time): Date {
  const { sec, nsec } = stamp;
  return new Date(sec * 1000 + nsec / 1e6);
}

export function fromDate(date: Date): Time {
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

export function subtractTimes({ sec: sec1, nsec: nsec1 }: Time, { sec: sec2, nsec: nsec2 }: Time): Time {
  return { sec: sec1 - sec2, nsec: nsec1 - nsec2 };
}

export function toSec({ sec, nsec }: Time) {
  return sec + nsec * 1e-9;
}

export function fromSec(value: number): Time {
  // https://github.com/ros/roscpp_core/blob/indigo-devel/rostime/include/ros/time.h#L153
  let sec = Math.trunc(value);
  let nsec = Math.round((value - sec) * 1e9);
  sec += Math.trunc(nsec / 1e9);
  nsec %= 1e9;
  return { sec, nsec };
}

export function fromMillis(value: number): Time {
  return fromSec(value / 1000);
}

export function findClosestTimestampIndex(currentTime: Time, frameTimestamps: string[] = []): number {
  const currT = toSec(currentTime);
  let [l, r] = [0, frameTimestamps.length - 1];

  while (l <= r) {
    const m = l + Math.floor((r - l) / 2);
    const prevT = Number(frameTimestamps[m]);
    const nextT = Number(frameTimestamps[m + 1]);

    if (prevT <= currT && currT < nextT) {
      return m;
    } else if (prevT < currT && nextT <= currT) {
      l = m + 1;
    } else {
      r = m - 1;
    }
  }
  return -1;
}

export function getNextFrame(effectiveFrameIndex: number, frameTimestamps: string[], modifier: number = 1): Time {
  const nextIndex = effectiveFrameIndex + modifier;
  const nextFrame = frameTimestamps[(nextIndex + frameTimestamps.length) % frameTimestamps.length];
  return fromSecondStamp(nextFrame);
}

export function formatFrame({ sec, nsec }: Time): string {
  return `${sec}.${String.prototype.padStart.call(nsec, 9, "0")}`;
}

export function transformBatchTimestamp({ seconds, nanoseconds }: BatchTimestamp): string {
  return formatFrame({ sec: seconds, nsec: nanoseconds });
}
