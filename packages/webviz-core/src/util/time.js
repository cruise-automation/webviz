// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// No time functions that require `moment` should live in this file.
import { type Time, TimeUtil } from "rosbag";

import { MIN_MEM_CACHE_BLOCK_SIZE_NS } from "webviz-core/src/dataProviders/MemoryCacheDataProvider";
import { cast, type Bobject, type Message } from "webviz-core/src/players/types";
import type { BinaryTime } from "webviz-core/src/types/BinaryMessages";
import { deepParse } from "webviz-core/src/util/binaryObjects";
import { parseTimeStr } from "webviz-core/src/util/formatTime";
import {
  SEEK_TO_FRACTION_QUERY_KEY,
  SEEK_TO_RELATIVE_MS_QUERY_KEY,
  SEEK_TO_UNIX_MS_QUERY_KEY,
} from "webviz-core/src/util/globalConstants";

type BatchTimestamp = {
  seconds: number,
  nanoseconds: number,
};

export type TimestampMethod = "receiveTime" | "headerStamp";

// Unfortunately, using %checks on this function doesn't actually allow Flow to conclude that the object is a Time.
// Related: https://github.com/facebook/flow/issues/3614
export function isTime(obj: mixed): boolean {
  return (
    !!obj && typeof obj === "object" && "sec" in obj && "nsec" in obj && Object.getOwnPropertyNames(obj).length === 2
  );
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

export function interpolateTimes(start: Time, end: Time, fraction: number): Time {
  const duration = subtractTimes(end, start);
  return TimeUtil.add(start, fromNanoSec(fraction * toNanoSec(duration)));
}

function fixTime(t: Time): Time {
  // Equivalent to fromNanoSec(toNanoSec(t)), but no chance of precision loss.
  // nsec should be non-negative, and less than 1e9.
  let { sec, nsec } = t;
  while (nsec >= 1e9) {
    nsec -= 1e9;
    sec += 1;
  }
  while (nsec < 0) {
    nsec += 1e9;
    sec -= 1;
  }
  return { sec, nsec };
}

export function subtractTimes({ sec: sec1, nsec: nsec1 }: Time, { sec: sec2, nsec: nsec2 }: Time): Time {
  return fixTime({ sec: sec1 - sec2, nsec: nsec1 - nsec2 });
}

// WARNING! This will not be a precise integer for large time values due to JS only supporting
// 53-bit integers. Best to only use this when the time represents a relatively small duration
// (at max a few weeks).
export function toNanoSec({ sec, nsec }: Time) {
  return sec * 1e9 + nsec;
}

// WARNING! Imprecise float; see above.
export function toMicroSec({ sec, nsec }: Time) {
  return (sec * 1e9 + nsec) / 1000;
}

// WARNING! Imprecise float; see above.
export function toSec({ sec, nsec }: Time): number {
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

export function toMillis(time: Time, roundUp: boolean = true): number {
  const secondsMillis = time.sec * 1e3;
  const nsecMillis = time.nsec / 1e6;
  return roundUp ? secondsMillis + Math.ceil(nsecMillis) : secondsMillis + Math.floor(nsecMillis);
}

export function fromMillis(value: number): Time {
  let sec = Math.trunc(value / 1000);
  let nsec = Math.round((value - sec * 1000) * 1e6);
  sec += Math.trunc(nsec / 1e9);
  nsec %= 1e9;
  return { sec, nsec };
}

export function fromMicros(value: number): Time {
  let sec = Math.trunc(value / 1e6);
  let nsec = Math.round((value - sec * 1e6) * 1e3);
  sec += Math.trunc(nsec / 1e9);
  nsec %= 1e9;
  return { sec, nsec };
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

export const isTimeInRangeInclusive = (time: Time, start: Time, end: Time) => {
  if (TimeUtil.compare(start, time) > 0 || TimeUtil.compare(end, time) < 0) {
    return false;
  }
  return true;
};

export function parseRosTimeStr(str: string): ?Time {
  if (/^\d+\.?$/.test(str)) {
    // Whole number with optional "." at the end.
    return { sec: parseInt(str, 10) || 0, nsec: 0 };
  }
  if (!/^\d+\.\d+$/.test(str)) {
    // Not digits.digits -- invalid.
    return null;
  }
  const partials = str.split(".");
  if (partials.length === 0) {
    return null;
  }
  // There can be 9 digits of nanoseconds. If the fractional part is "1", we need to add eight
  // zeros. Also, make sure we round to an integer if we need to _remove_ digits.
  const digitsShort = 9 - partials[1].length;
  const nsec = Math.round(parseInt(partials[1], 10) * 10 ** digitsShort);
  // It's possible we rounded to { sec: 1, nsec: 1e9 }, which is invalid, so fixTime.
  return fixTime({ sec: parseInt(partials[0], 10) || 0, nsec });
}

// Functions and types for specifying and applying player initial seek time intentions.
// When loading from a copied URL, the exact unix time is used.
type AbsoluteSeekToTime = $ReadOnly<{| type: "absolute", time: Time |}>;
// If no seek time is specified, we default to 299ms from the start of the bag. Finer control is
// exposed for use-cases where it's needed.
type RelativeSeekToTime = $ReadOnly<{| type: "relative", startOffset: Time |}>;
// Currently unused: We may expose interactive seek controls before the bag duration is known, and
// store the seek state as a fraction of the eventual bag length.
type SeekFraction = $ReadOnly<{| type: "fraction", fraction: number |}>;
export type SeekToTimeSpec = AbsoluteSeekToTime | RelativeSeekToTime | SeekFraction;

// Amount to seek into the bag from the start when loading the player, to show
// something useful on the screen. Ideally this is less than BLOCK_SIZE_NS from
// MemoryCacheDataProvider so we still stay within the first block when fetching
// initial data.
export const SEEK_ON_START_NS = 99 /* ms */ * 1e6;
if (SEEK_ON_START_NS >= MIN_MEM_CACHE_BLOCK_SIZE_NS) {
  throw new Error(
    "SEEK_ON_START_NS should be less than MIN_MEM_CACHE_BLOCK_SIZE_NS (to keep initial backfill within one block)"
  );
}

export function getSeekToTime(): SeekToTimeSpec {
  const params = new URLSearchParams(window.location.search);
  const absoluteSeek = params.get(SEEK_TO_UNIX_MS_QUERY_KEY);
  const defaultResult = { type: "relative", startOffset: fromNanoSec(SEEK_ON_START_NS) };
  if (absoluteSeek != null) {
    return isNaN(absoluteSeek) ? defaultResult : { type: "absolute", time: fromMillis(parseInt(absoluteSeek)) };
  }
  const relativeSeek = params.get(SEEK_TO_RELATIVE_MS_QUERY_KEY);
  if (relativeSeek != null) {
    return isNaN(relativeSeek) ? defaultResult : { type: "relative", startOffset: fromMillis(parseInt(relativeSeek)) };
  }
  const seekFraction = params.get(SEEK_TO_FRACTION_QUERY_KEY);
  if (seekFraction != null) {
    return isNaN(seekFraction) ? defaultResult : { type: "fraction", fraction: parseFloat(seekFraction) };
  }
  return defaultResult;
}

export function getSeekTimeFromSpec(spec: SeekToTimeSpec, start: Time, end: Time): Time {
  const rawSpecTime =
    spec.type === "absolute"
      ? spec.time
      : spec.type === "relative"
      ? TimeUtil.add(TimeUtil.isLessThan(spec.startOffset, { sec: 0, nsec: 0 }) ? end : start, spec.startOffset)
      : interpolateTimes(start, end, spec.fraction);
  return clampTime(rawSpecTime, start, end);
}

export function getTimestampForMessage(message: Message, timestampMethod?: TimestampMethod): ?Time {
  if (timestampMethod === "headerStamp") {
    if (message.message.header?.stamp?.sec != null && message.message.header?.stamp?.nsec != null) {
      return message.message.header.stamp;
    }
    return undefined;
  }
  return message.receiveTime;
}

export const compareBinaryTimes = (a: BinaryTime, b: BinaryTime) => {
  return a.sec() - b.sec() || a.nsec() - b.nsec();
};

// Descriptive -- not a real type
type MaybeStampedBobject = $ReadOnly<{|
  header?: () => $ReadOnly<{| stamp?: () => mixed |}>,
|}>;

export const maybeGetBobjectHeaderStamp = (message: ?Bobject): ?Time => {
  if (message == null) {
    return;
  }
  const maybeStamped = cast<MaybeStampedBobject>(message);
  const header = maybeStamped.header && maybeStamped.header();
  const stamp = header && header.stamp && deepParse(header.stamp());
  if (isTime(stamp)) {
    return stamp;
  }
};

export const getRosTimeFromString = (text: string) => {
  if (!text.length || isNaN(text)) {
    return;
  }
  const textAsNum = Number(text);
  return { sec: Math.floor(textAsNum), nsec: textAsNum * 1e9 - Math.floor(textAsNum) * 1e9 };
};

const todTimeRegex = /^\d+:\d+:\d+.\d+\s[PpAa][Mm]\s[A-Za-z$]+/;
export const getValidatedTimeAndMethodFromString = ({
  text,
  date,
  timezone,
}: {
  text: ?string,
  date: string,
  timezone: ?string,
}): ?{ time: ?Time, method: "ROS" | "TOD" } => {
  if (!text) {
    return;
  }
  const isInvalidRosTime = isNaN(text);
  const isInvalidTodTime = !(todTimeRegex.test(text || "") && parseTimeStr(`${date} ${text || ""}`, timezone));

  if (isInvalidRosTime && isInvalidTodTime) {
    return;
  }

  return {
    time: !isInvalidRosTime ? getRosTimeFromString(text || "") : parseTimeStr(`${date} ${text || ""}`, timezone),
    method: isInvalidRosTime ? "TOD" : "ROS",
  };
};
