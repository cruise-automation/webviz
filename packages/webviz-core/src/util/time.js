// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import momentDurationFormatSetup from "moment-duration-format";
import moment from "moment-timezone";
import { type Time, TimeUtil } from "rosbag";

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

export function toNanoSec({ sec, nsec }: Time) {
  return sec * 1e9 + nsec;
}

export function toSec({ sec, nsec }: Time) {
  return sec + nsec * 1e-9;
}

export function fromSec(value: number): Time {
  // From https://github.com/ros/roscpp_core/blob/indigo-devel/rostime/include/ros/time.h#L153
  let sec = Math.trunc(value);
  let nsec = Math.round((value - sec) * 1e9);
  sec += Math.trunc(nsec / 1e9);
  nsec %= 1e9;
  return { sec, nsec };
}

export function fromNanoSec(nsec: number): Time {
  // From https://github.com/ros/roscpp_core/blob/86720717c0e1200234cc0a3545a255b60fb541ec/rostime/include/ros/impl/time.h#L63
  // and https://github.com/ros/roscpp_core/blob/7583b7d38c6e1c2e8623f6d98559c483f7a64c83/rostime/src/time.cpp#L536
  return { sec: Math.trunc(nsec / 1e9), nsec: nsec % 1e9 };
}

export function fromMillis(value: number): Time {
  return fromSec(value / 1000);
}

export function findClosestTimestampIndex(currentTime: Time, frameTimestamps: string[] = []): number {
  const currT = toSec(currentTime);
  const timestamps = frameTimestamps.map(Number);
  const maxIdx = frameTimestamps.length - 1;
  if (frameTimestamps.length === 0) {
    return -1;
  }
  let [l, r] = [0, maxIdx];
  if (currT <= timestamps[0]) {
    return 0;
  } else if (currT >= timestamps[maxIdx]) {
    return maxIdx;
  }

  while (l <= r) {
    const m = l + Math.floor((r - l) / 2);
    const prevT = timestamps[m];
    const nextT = timestamps[m + 1];

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

export function getNextFrame(currentTime: Time, timestamps: string[] = [], goLeft?: boolean): ?Time {
  if (!timestamps.length) {
    return null;
  }
  const effectiveIdx = findClosestTimestampIndex(currentTime, timestamps);
  if (effectiveIdx === -1) {
    return null;
  }
  let nextIdx = 0;
  const maxIdx = timestamps.length - 1;
  if (effectiveIdx === -1) {
    nextIdx = goLeft ? maxIdx : 0;
  } else {
    nextIdx = effectiveIdx + (goLeft ? -1 : 1);
    if (nextIdx < 0) {
      nextIdx = maxIdx;
    } else if (nextIdx > maxIdx) {
      nextIdx = 0;
    }
  }
  const nextFrame = timestamps[nextIdx];
  return fromSecondStamp(nextFrame);
}

export function formatFrame({ sec, nsec }: Time): string {
  return `${sec}.${String.prototype.padStart.call(nsec, 9, "0")}`;
}

export function transformBatchTimestamp({ seconds, nanoseconds }: BatchTimestamp): string {
  return formatFrame({ sec: seconds, nsec: nanoseconds });
}

export function clampTime(time: Time, start: Time, end: Time): Time {
  if (TimeUtil.compare(start, time) > 0) {
    return start;
  }
  if (TimeUtil.compare(end, time) < 0) {
    return end;
  }
  return time;
}

export function parseRosTimeStr(str: string): ?Time {
  if (/^\d+\.?$/.test(str)) {
    return { sec: parseInt(str, 10) || 0, nsec: 0 };
  }
  if (!/^\d+\.\d+$/.test(str)) {
    return null;
  }
  const partials = str.split(".");
  if (partials.length === 0) {
    return null;
  }
  return { sec: parseInt(partials[0], 10) || 0, nsec: parseInt(partials[1], 10) || 0 };
}

export function parseTimeStr(str: string): ?Time {
  const newMomentTimeObj = moment(str, "YYYY-MM-DD h:mm:ss.SSS A z");
  const date = newMomentTimeObj.toDate();
  const result = (newMomentTimeObj.isValid() && fromDate(date)) || null;

  if (!result || result.sec <= 0 || result.nsec < 0) {
    return null;
  }
  return result;
}
