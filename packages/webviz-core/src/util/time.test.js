// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { Time } from "rosbag";

import * as time from "./time";

describe("time.toDate & time.fromDate", () => {
  it("converts to date and from date", () => {
    const totalSeconds = Math.round(Date.now() / 1000);
    const stamp = { sec: totalSeconds, nsec: 1000 };
    const now = new Date(totalSeconds * 1000);
    expect(time.toDate(stamp)).toEqual(now);
    expect(time.fromDate(now)).toEqual({ sec: totalSeconds, nsec: 0 });

    const nowPlus1ms = new Date(totalSeconds * 1000 + 1);
    expect(time.toDate({ sec: totalSeconds, nsec: 1 * 1e6 })).toEqual(nowPlus1ms);
    expect(time.fromDate(nowPlus1ms)).toEqual({
      sec: totalSeconds,
      nsec: 1000000,
    });
  });
});

describe("time.fromNanoSecondStamp", () => {
  it("converts from nanoseconds to time", () => {
    const nanos1 = "1508410740582458241";
    expect(time.fromNanosecondStamp(nanos1)).toEqual({ sec: 1508410740, nsec: 582458241 });
    const nanos2 = "1508428043155306000";
    expect(time.fromNanosecondStamp(nanos2)).toEqual({ sec: 1508428043, nsec: 155306000 });
    expect(time.fromNanosecondStamp("5001")).toEqual({ sec: 0, nsec: 5001 });
    const nanos3 = `${1e10 + 1}`;
    expect(time.fromNanosecondStamp(nanos3)).toEqual({ sec: 10, nsec: 1 });
    expect(time.fromNanosecondStamp("0")).toEqual({ sec: 0, nsec: 0 });
  });

  it("does not convert invalid times", () => {
    expect(() => time.fromNanosecondStamp("1000x00")).toThrow();
    expect(() => time.fromNanosecondStamp("1000 00")).toThrow();
    expect(() => time.fromNanosecondStamp("")).toThrow();
    expect(() => time.fromNanosecondStamp("-1")).toThrow();
    expect(() => time.fromNanosecondStamp("1000.000")).toThrow();
  });
});

describe("percentOf", () => {
  it("gives percentages correctly", () => {
    const start = new Time(0, 0);
    const end = new Time(10, 0);
    expect(time.percentOf(start, end, new Time(5, 0))).toEqual(50);
    expect(time.percentOf(start, end, new Time(1, 0))).toEqual(10);
    expect(time.percentOf(start, end, new Time(0, 1e9))).toEqual(10);
    expect(time.percentOf(start, end, new Time(0, 1e7))).toEqual(0.1);
    expect(time.percentOf(start, end, new Time(-1, 0))).toEqual(-10);
  });
});

describe("time.formatDuration", () => {
  it("uses milliseconds and pads values with zeros", () => {
    expect(time.formatDuration({ sec: 0, nsec: 0 })).toEqual("0:00:00.000");
    expect(time.formatDuration({ sec: 0, nsec: 999 })).toEqual("0:00:00.000");
    expect(time.formatDuration({ sec: 0, nsec: 1000 })).toEqual("0:00:00.000");
    expect(time.formatDuration({ sec: 0, nsec: 499999 })).toEqual("0:00:00.000");
    expect(time.formatDuration({ sec: 0, nsec: 500000 })).toEqual("0:00:00.001");
    expect(time.formatDuration({ sec: 0, nsec: 999e3 })).toEqual("0:00:00.001");
    expect(time.formatDuration({ sec: 0, nsec: 999e6 })).toEqual("0:00:00.999");
    expect(time.formatDuration({ sec: 1, nsec: 999e6 })).toEqual("0:00:01.999");
    expect(time.formatDuration({ sec: 1, nsec: 999999e3 })).toEqual("0:00:02.000");
    expect(time.formatDuration({ sec: 1, nsec: 999999999 })).toEqual("0:00:02.000");
    expect(time.formatDuration({ sec: 3 * 60 * 60 + 2 * 60 + 1, nsec: 999e6 })).toEqual("3:02:01.999");
    expect(time.formatDuration({ sec: 3 * 60 * 60 + 59 * 60 + 59, nsec: 99e6 })).toEqual("3:59:59.099");
    expect(time.formatDuration({ sec: -1, nsec: 0 })).toEqual("-0:00:01.000");
    expect(time.formatDuration({ sec: 0, nsec: -1000000 })).toEqual("-0:00:00.001");
  });
});

describe("time.formatTimeRaw", () => {
  it("formats whole values correction", () => {
    expect(time.formatTimeRaw({ sec: 1, nsec: 0 })).toEqual("1.000000000");
  });

  it("formats partial nanos", () => {
    expect(time.formatTimeRaw({ sec: 102, nsec: 304 })).toEqual("102.000000304");
    expect(time.formatTimeRaw({ sec: 102, nsec: 99900000 })).toEqual("102.099900000");
  });

  it("formats max nanos", () => {
    expect(time.formatTimeRaw({ sec: 102, nsec: 999000000 })).toEqual("102.999000000");
  });

  it("does not format negative times", () => {
    expect(time.formatTimeRaw({ sec: -1, nsec: 0 })).toEqual("(invalid negative time)");
  });
});

describe("time.toSec", () => {
  expect(time.toSec({ sec: 1, nsec: 0 })).toBe(1);
  expect(time.toSec({ sec: 1, nsec: 1 })).toBe(1.000000001);
  expect(time.toSec({ sec: 1, nsec: 999999999 })).toBe(1.999999999);
  expect(time.toSec({ sec: 1, nsec: 1000000000 })).toBe(2);
});

describe("time.fromSec", () => {
  it("handles positive values", () => {
    expect(time.fromSec(1)).toEqual({ sec: 1, nsec: 0 });
    expect(time.fromSec(1.000000001)).toEqual({ sec: 1, nsec: 1 });
    expect(time.fromSec(1.999999999)).toEqual({ sec: 1, nsec: 999999999 });
    expect(time.fromSec(1.9999999994)).toEqual({ sec: 1, nsec: 999999999 });
    expect(time.fromSec(1.999999999999)).toEqual({ sec: 2, nsec: 0 });
    expect(time.fromSec(2)).toEqual({ sec: 2, nsec: 0 });
  });

  it("handles negative values", () => {
    expect(time.fromSec(-1)).toEqual({ sec: -1, nsec: 0 });
    expect(time.fromSec(-1.000000001)).toEqual({ sec: -1, nsec: -1 });
    expect(time.fromSec(-1.999999999)).toEqual({ sec: -1, nsec: -999999999 });
    expect(time.fromSec(-1.9999999994)).toEqual({ sec: -1, nsec: -999999999 });
    expect(time.fromSec(-1.999999999999)).toEqual({ sec: -2, nsec: -0 });
    expect(time.fromSec(-2)).toEqual({ sec: -2, nsec: 0 });
  });
});

describe("time.fromMillis", () => {
  it("handles positive values", () => {
    expect(time.fromMillis(1)).toEqual({ sec: 0, nsec: 1000000 });
    expect(time.fromMillis(1000)).toEqual({ sec: 1, nsec: 0 });
  });

  it("handles negative values", () => {
    expect(time.fromMillis(-1)).toEqual({ sec: -0, nsec: -1000000 });
    expect(time.fromMillis(-1000)).toEqual({ sec: -1, nsec: 0 });
  });
});

describe("time.subtractTimes", () => {
  expect(time.subtractTimes({ sec: 1, nsec: 1 }, { sec: 1, nsec: 1 })).toEqual({ sec: 0, nsec: 0 });
  expect(time.subtractTimes({ sec: 1, nsec: 2 }, { sec: 2, nsec: 1 })).toEqual({ sec: -1, nsec: 1 });
  expect(time.subtractTimes({ sec: 5, nsec: 100 }, { sec: 2, nsec: 10 })).toEqual({ sec: 3, nsec: 90 });
  expect(time.subtractTimes({ sec: 1, nsec: 1e8 }, { sec: 0, nsec: 5e8 })).toEqual({ sec: 1, nsec: -400000000 });
  expect(time.subtractTimes({ sec: 1, nsec: 0 }, { sec: 0, nsec: 1e9 - 1 })).toEqual({ sec: 1, nsec: -999999999 });
  expect(time.subtractTimes({ sec: 0, nsec: 0 }, { sec: 0, nsec: 1 })).toEqual({ sec: 0, nsec: -1 });
});

describe("time.getNextFrame", () => {
  const timestamps = ["1508410740582458241", "1508428043155306000"];
  expect(time.getNextFrame(0, timestamps)).toEqual({ sec: 1508428043, nsec: 155306000 });
  expect(time.getNextFrame(1, timestamps)).toEqual({ sec: 1508410740, nsec: 582458241 });
  expect(time.getNextFrame(0, timestamps, -1)).toEqual({ sec: 1508428043, nsec: 155306000 });
});

describe("time.findClosestTimestampIndex", () => {
  it("returns -1 for values that do not exist or are before the first timestamp", () => {
    expect(time.findClosestTimestampIndex({ sec: 1, nsec: 0 })).toEqual(-1);
    expect(time.findClosestTimestampIndex({ sec: 1, nsec: 0 }, [])).toEqual(-1);
    expect(time.findClosestTimestampIndex({ sec: 1, nsec: 0 }, ["2000000000"])).toEqual(-1);
    expect(time.findClosestTimestampIndex({ sec: 0, nsec: 10 }, ["1000000000"])).toEqual(-1);
  });
});
