// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as time from "./time";
import { cast } from "webviz-core/src/players/types";
import type { BinaryTime } from "webviz-core/src/types/BinaryMessages";
import { deepParse, wrapJsObject } from "webviz-core/src/util/binaryObjects";

const { fromSecondStamp } = time;
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

describe("time.fromSecondStamp", () => {
  it("converts from nanoseconds to time", () => {
    const nanos1 = "1508410740.582458241";
    expect(time.fromSecondStamp(nanos1)).toEqual({ sec: 1508410740, nsec: 582458241 });
    const nanos2 = "1508428043.155306000";
    expect(time.fromSecondStamp(nanos2)).toEqual({ sec: 1508428043, nsec: 155306000 });
    expect(time.fromSecondStamp("5001")).toEqual({ sec: 5001, nsec: 0 });
    const nanos3 = `${1e10 + 1}`;
    expect(time.fromSecondStamp(nanos3)).toEqual({ sec: 1e10 + 1, nsec: 0 });
    expect(time.fromSecondStamp("0")).toEqual({ sec: 0, nsec: 0 });
    expect(time.fromSecondStamp("1000.000")).toEqual({ sec: 1000, nsec: 0 });
  });

  it("does not convert invalid times", () => {
    expect(() => time.fromSecondStamp("1000x00")).toThrow();
    expect(() => time.fromSecondStamp("1000 00")).toThrow();
    expect(() => time.fromSecondStamp("")).toThrow();
    expect(() => time.fromSecondStamp("-1")).toThrow();
  });
});

describe("percentOf", () => {
  it("gives percentages correctly", () => {
    const start = { sec: 0, nsec: 0 };
    const end = { sec: 10, nsec: 0 };
    expect(time.percentOf(start, end, { sec: 5, nsec: 0 })).toEqual(50);
    expect(time.percentOf(start, end, { sec: 1, nsec: 0 })).toEqual(10);
    expect(time.percentOf(start, end, { sec: 0, nsec: 1e9 })).toEqual(10);
    expect(time.percentOf(start, end, { sec: 0, nsec: 1e7 })).toEqual(0.1);
    expect(time.percentOf(start, end, { sec: -1, nsec: 0 })).toEqual(-10);
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
    jest.spyOn(console, "error").mockReturnValue();
    expect(time.formatTimeRaw({ sec: -1, nsec: 0 })).toEqual("(invalid negative time)");
    expect(console.error).toHaveBeenCalled();
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
    expect(time.fromMillis(2000000000005)).toEqual({ sec: 2000000000, nsec: 5000000 });
  });

  it("handles negative values", () => {
    expect(time.fromMillis(-1)).toEqual({ sec: -0, nsec: -1000000 });
    expect(time.fromMillis(-1000)).toEqual({ sec: -1, nsec: 0 });
  });
});

describe("time.fromMicros", () => {
  it("handles positive values", () => {
    expect(time.fromMicros(1)).toEqual({ sec: 0, nsec: 1000 });
    expect(time.fromMicros(1000)).toEqual({ sec: 0, nsec: 1000000 });
    expect(time.fromMicros(1000000)).toEqual({ sec: 1, nsec: 0 });
    expect(time.fromMicros(2000000000000005)).toEqual({ sec: 2000000000, nsec: 5000 });
  });

  it("handles negative values", () => {
    expect(time.fromMicros(-1)).toEqual({ sec: -0, nsec: -1000 });
    expect(time.fromMicros(-1000)).toEqual({ sec: -0, nsec: -1000000 });
    expect(time.fromMicros(-1000000)).toEqual({ sec: -1, nsec: 0 });
  });
});

describe("time.subtractTimes", () => {
  expect(time.subtractTimes({ sec: 1, nsec: 1 }, { sec: 1, nsec: 1 })).toEqual({ sec: 0, nsec: 0 });
  expect(time.subtractTimes({ sec: 1, nsec: 2 }, { sec: 2, nsec: 1 })).toEqual({ sec: -1, nsec: 1 });
  expect(time.subtractTimes({ sec: 5, nsec: 100 }, { sec: 2, nsec: 10 })).toEqual({ sec: 3, nsec: 90 });
  expect(time.subtractTimes({ sec: 1, nsec: 1e8 }, { sec: 0, nsec: 5e8 })).toEqual({ sec: 0, nsec: 600000000 });
  expect(time.subtractTimes({ sec: 1, nsec: 0 }, { sec: 0, nsec: 1e9 - 1 })).toEqual({ sec: 0, nsec: 1 });
  expect(time.subtractTimes({ sec: 0, nsec: 0 }, { sec: 0, nsec: 1 })).toEqual({ sec: -1, nsec: 1e9 - 1 });
});

describe("time.findClosestTimestampIndex", () => {
  it("returns 0 for value before the first timestamp", () => {
    expect(time.findClosestTimestampIndex({ sec: 1, nsec: 0 }, ["2", "3"])).toEqual(0);
  });

  it("returns last timestamp index for value after the last timestamp", () => {
    expect(time.findClosestTimestampIndex({ sec: 11, nsec: 0 }, ["2", "3"])).toEqual(1);
  });

  it("returns -1 for empty timestamps", () => {
    expect(time.findClosestTimestampIndex({ sec: 1, nsec: 0 })).toEqual(-1);
  });

  it("returns the correct timestamp index on the lower bound", () => {
    expect(time.findClosestTimestampIndex({ sec: 1, nsec: 0 }, ["1", "2"])).toEqual(0);
    expect(time.findClosestTimestampIndex({ sec: 1, nsec: 999999999 }, ["1", "2"])).toEqual(0);
    expect(time.findClosestTimestampIndex({ sec: 2, nsec: 999999999 }, ["1", "2", "3"])).toEqual(1);
  });
});

describe("time.getNextFrame", () => {
  const timestamps = ["4.049839000", "4.249933000", "4.449961000", "5.650058000"];
  it("returns null for empty timestamps", async () => {
    expect(time.getNextFrame({ sec: 3, nsec: 0 }, [])).toEqual(null);
  });

  it("returns the next frame ", async () => {
    expect(time.getNextFrame({ sec: 3, nsec: 0 }, timestamps)).toEqual(fromSecondStamp(timestamps[1]));
    expect(time.getNextFrame({ sec: 4, nsec: 240000000 }, timestamps)).toEqual(fromSecondStamp(timestamps[1]));
    expect(time.getNextFrame({ sec: 4, nsec: 249933000 }, timestamps)).toEqual(fromSecondStamp(timestamps[2]));
    expect(time.getNextFrame({ sec: 5, nsec: 650058000 }, timestamps)).toEqual(fromSecondStamp(timestamps[0]));
    expect(time.getNextFrame({ sec: 6, nsec: 0 }, timestamps)).toEqual(fromSecondStamp(timestamps[0]));
  });

  it("returns the previous frame ", async () => {
    expect(time.getNextFrame({ sec: 3, nsec: 0 }, timestamps, true)).toEqual(
      fromSecondStamp(timestamps[timestamps.length - 1])
    );
    expect(time.getNextFrame({ sec: 6, nsec: 0 }, timestamps, true)).toEqual(
      fromSecondStamp(timestamps[timestamps.length - 2])
    );
    expect(time.getNextFrame({ sec: 5, nsec: 650058000 }, timestamps, true)).toEqual(
      fromSecondStamp(timestamps[timestamps.length - 2])
    );
    expect(time.getNextFrame({ sec: 5, nsec: 640058000 }, timestamps, true)).toEqual(
      fromSecondStamp(timestamps[timestamps.length - 3])
    );
  });
});

describe("time.clampTime", () => {
  const start = { sec: 0, nsec: 100 };
  const end = { sec: 100, nsec: 100 };
  it("returns the clamped time", () => {
    expect(time.clampTime({ sec: 0, nsec: 99 }, start, end)).toEqual(start);
    expect(time.clampTime({ sec: 0, nsec: 101 }, start, end)).toEqual({ sec: 0, nsec: 101 });
    expect(time.clampTime({ sec: 100, nsec: 102 }, start, end)).toEqual(end);
  });
});

describe("time.isTimeInRangeInclusive", () => {
  const start = { sec: 0, nsec: 100 };
  const end = { sec: 100, nsec: 100 };
  it("returns whether time is between start and end, inclusive", () => {
    expect(time.isTimeInRangeInclusive(start, start, end)).toEqual(true);
    expect(time.isTimeInRangeInclusive(end, start, end)).toEqual(true);
    expect(time.isTimeInRangeInclusive({ sec: 50, nsec: 50 }, start, end)).toEqual(true);
    expect(time.isTimeInRangeInclusive({ sec: 0, nsec: 99 }, start, end)).toEqual(false);
    expect(time.isTimeInRangeInclusive({ sec: 100, nsec: 101 }, start, end)).toEqual(false);
  });
});

describe("time.parseRosTimeStr", () => {
  it("returns null if the input string is formatted incorrectly", () => {
    expect(time.parseRosTimeStr("")).toEqual(null);
    expect(time.parseRosTimeStr(".12121")).toEqual(null);
    expect(time.parseRosTimeStr(".")).toEqual(null);
  });

  it("returns the correct time", () => {
    expect(time.parseRosTimeStr("12121.")).toEqual({ sec: 12121, nsec: 0 });
    expect(time.parseRosTimeStr("1")).toEqual({ sec: 1, nsec: 0 });
    expect(time.parseRosTimeStr("1.")).toEqual({ sec: 1, nsec: 0 });
    expect(time.parseRosTimeStr("1.12")).toEqual({ sec: 1, nsec: 0.12e9 });
    expect(time.parseRosTimeStr("100.100")).toEqual({ sec: 100, nsec: 0.1e9 });
    expect(time.parseRosTimeStr("100")).toEqual({ sec: 100, nsec: 0 });
    // Full nanosecond timestamp
    expect(time.parseRosTimeStr("1.123456789")).toEqual({ sec: 1, nsec: 0.123456789e9 });
    // Too much precision
    expect(time.parseRosTimeStr("1.0123456789")).toEqual({ sec: 1, nsec: 0.012345679e9 });
    // Too much precision, round seconds up.
    expect(time.parseRosTimeStr("1.999999999999")).toEqual({ sec: 2, nsec: 0 });
  });
});

describe("time.getTimestampForMessage", () => {
  it("uses headerStamp when available", () => {
    const messageBase = {
      topic: "/foo",
      receiveTime: { sec: 1000, nsec: 0 },
    };

    expect(
      time.getTimestampForMessage(
        { ...messageBase, message: { header: { stamp: { sec: 123, nsec: 456 } } } },
        "headerStamp"
      )
    ).toEqual({ sec: 123, nsec: 456 });
    expect(
      time.getTimestampForMessage(
        { ...messageBase, message: { header: { stamp: { sec: 0, nsec: 0 } } } },
        "headerStamp"
      )
    ).toEqual({ sec: 0, nsec: 0 });
    expect(
      time.getTimestampForMessage({ ...messageBase, message: { header: { stamp: { sec: 123 } } } }, "headerStamp")
    ).toEqual(undefined);
    expect(time.getTimestampForMessage({ ...messageBase, message: { header: {} } }, "headerStamp")).toEqual(undefined);
  });
});

describe("time.compareBinaryTimes", () => {
  it("properly orders a list of times", () => {
    const times = [{ sec: 1, nsec: 1 }, { sec: 0, nsec: 0 }, { sec: 1, nsec: 0 }, { sec: 0, nsec: 1 }];
    const binaryTimes = times.map((t) => cast<BinaryTime>(wrapJsObject({}, "time", t)));
    expect(binaryTimes.sort(time.compareBinaryTimes).map(deepParse)).toEqual([
      { sec: 0, nsec: 0 },
      { sec: 0, nsec: 1 },
      { sec: 1, nsec: 0 },
      { sec: 1, nsec: 1 },
    ]);
  });
});

describe("time.interpolateTimes", () => {
  it("works for zero-duration spans", () => {
    const t = { sec: 0, nsec: 0 };
    expect(time.interpolateTimes(t, t, 0)).toEqual(t);
    expect(time.interpolateTimes(t, t, -1)).toEqual(t);
    expect(time.interpolateTimes(t, t, 1)).toEqual(t);
  });

  it("works for non-zero spans", () => {
    const start = { sec: 0, nsec: 0 };
    const end = { sec: 5, nsec: 0 };
    expect(time.interpolateTimes(start, end, 0)).toEqual(start);
    expect(time.interpolateTimes(start, end, 1)).toEqual(end);
    expect(time.interpolateTimes(start, end, 0.5)).toEqual({ sec: 2, nsec: 5e8 });
    expect(time.interpolateTimes(start, end, 2)).toEqual({ sec: 10, nsec: 0 });
  });
});

describe("time.getSeekTimeFromSpec", () => {
  it("returns absolute seek times", () => {
    expect(
      time.getSeekTimeFromSpec(
        { type: "absolute", time: { sec: 12, nsec: 0 } },
        { sec: 10, nsec: 0 },
        { sec: 15, nsec: 0 }
      )
    ).toEqual({ sec: 12, nsec: 0 });
  });

  it("adds relative offsets", () => {
    expect(
      time.getSeekTimeFromSpec(
        { type: "relative", startOffset: { sec: 1, nsec: 0 } },
        { sec: 10, nsec: 0 },
        { sec: 15, nsec: 0 }
      )
    ).toEqual({ sec: 11, nsec: 0 });
  });

  it("supports negative relative offsets", () => {
    expect(
      time.getSeekTimeFromSpec(
        { type: "relative", startOffset: { sec: -1, nsec: 5e8 } }, // minus half a second
        { sec: 10, nsec: 0 },
        { sec: 15, nsec: 0 }
      )
    ).toEqual({ sec: 14, nsec: 5e8 });
  });

  it("calculates fractional times", () => {
    expect(
      time.getSeekTimeFromSpec({ type: "fraction", fraction: 0.6 }, { sec: 10, nsec: 0 }, { sec: 15, nsec: 0 })
    ).toEqual({ sec: 13, nsec: 0 });
  });

  it("clamps seek times to the playback range", () => {
    const start = { sec: 10, nsec: 0 };
    const end = { sec: 15, nsec: 0 };
    expect(time.getSeekTimeFromSpec({ type: "absolute", time: { sec: 6, nsec: 0 } }, start, end)).toEqual(start);
    expect(time.getSeekTimeFromSpec({ type: "absolute", time: { sec: 16, nsec: 0 } }, start, end)).toEqual(end);

    expect(time.getSeekTimeFromSpec({ type: "relative", startOffset: { sec: -6, nsec: 0 } }, start, end)).toEqual(
      start
    );
    expect(time.getSeekTimeFromSpec({ type: "relative", startOffset: { sec: 6, nsec: 0 } }, start, end)).toEqual(end);

    expect(time.getSeekTimeFromSpec({ type: "fraction", fraction: -1 }, start, end)).toEqual(start);
    expect(time.getSeekTimeFromSpec({ type: "fraction", fraction: 2 }, start, end)).toEqual(end);
  });
});

describe("time.getRosTimeFromString", () => {
  it("takes a stringified number and returns time object", () => {
    expect(time.getRosTimeFromString("")).toEqual(undefined);
    expect(time.getRosTimeFromString("abc")).toEqual(undefined);
    expect(time.getRosTimeFromString("123456.000000000")).toEqual({ sec: 123456, nsec: 0 });
    expect(time.getRosTimeFromString("123456.100000000")).toEqual({ sec: 123456, nsec: 100000000 });
    expect(time.getRosTimeFromString("123456.123456789")).toEqual({ sec: 123456, nsec: 123456789 });
  });
});

describe("time.getValidatedTimeAndMethodFromString", () => {
  const commonArgs = { date: "2020-01-01", timezone: "America/Los_Angeles" };
  it("takes a string and gets a validated ROS or TOD time", () => {
    expect(time.getValidatedTimeAndMethodFromString({ ...commonArgs, text: "" })).toEqual(undefined);
    expect(time.getValidatedTimeAndMethodFromString({ ...commonArgs, text: "abc" })).toEqual(undefined);
    expect(time.getValidatedTimeAndMethodFromString({ ...commonArgs, text: "123abc" })).toEqual(undefined);
    expect(time.getValidatedTimeAndMethodFromString({ ...commonArgs, text: "1598635994.000000000" })).toEqual({
      time: { nsec: 0, sec: 1598635994 },
      method: "ROS",
    });
    expect(time.getValidatedTimeAndMethodFromString({ ...commonArgs, text: "1:30:10.000 PM PST" })).toEqual({
      time: { nsec: 0, sec: 1577914210 },
      method: "TOD",
    });
  });
});
