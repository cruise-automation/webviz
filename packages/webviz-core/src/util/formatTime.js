// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import momentDurationFormatSetup from "moment-duration-format";
import moment from "moment-timezone";
import { type Time } from "rosbag";

import { toDate, fromDate } from "./time";

// All time functions that require `moment` should live in this file.

momentDurationFormatSetup(moment);

export function format(stamp: Time) {
  return `${formatDate(stamp)} ${formatTime(stamp)}`;
}

export function formatDate(stamp: Time, timezone?: ?string) {
  if (stamp.sec < 0 || stamp.nsec < 0) {
    console.error("Times are not allowed to be negative");
    return "(invalid negative time)";
  }
  return moment.tz(toDate(stamp), timezone || moment.tz.guess()).format("YYYY-MM-DD");
}

export function formatTime(stamp: Time, timezone?: ?string) {
  if (stamp.sec < 0 || stamp.nsec < 0) {
    console.error("Times are not allowed to be negative");
    return "(invalid negative time)";
  }
  return moment.tz(toDate(stamp), timezone || moment.tz.guess()).format("h:mm:ss.SSS A z");
}

export function formatTimeRaw(stamp: Time) {
  if (stamp.sec < 0 || stamp.nsec < 0) {
    console.error("Times are not allowed to be negative");
    return "(invalid negative time)";
  }
  return `${stamp.sec}.${stamp.nsec.toFixed().padStart(9, "0")}`;
}

export function formatDuration(stamp: Time) {
  return moment.duration(Math.round(stamp.sec * 1000 + stamp.nsec / 1e6)).format("h:mm:ss.SSS", { trim: false });
}

export function parseTimeStr(str: string, timezone?: ?string): ?Time {
  const newMomentTimeObj = timezone
    ? moment.tz(str, "YYYY-MM-DD h:mm:ss.SSS A z", timezone)
    : moment(str, "YYYY-MM-DD h:mm:ss.SSS A z");
  const date = newMomentTimeObj.toDate();
  const result = (newMomentTimeObj.isValid() && fromDate(date)) || null;

  if (!result || result.sec <= 0 || result.nsec < 0) {
    return null;
  }
  return result;
}
