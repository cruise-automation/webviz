// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as time from "./time";

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

describe("time.formatDate", () => {
  it("formats date based on provided timezone", () => {
    expect(time.formatDate({ sec: 1, nsec: 0 }, "Asia/Bangkok")).toBe("1970-01-01");
    expect(time.formatDate({ sec: 1, nsec: 1 }, "Australia/Currie")).toBe("1970-01-01");
    expect(time.formatDate({ sec: 1000000, nsec: 0 }, "Pacific/Midway")).toBe("1970-01-12");
    expect(time.formatDate({ sec: 1100000, nsec: 1000000000 }, "America/Los_Angeles")).toBe("1970-01-13");
  });
});

describe("time.formatTime", () => {
  it("formats time based on provided timezone", () => {
    expect(time.formatTime({ sec: 1, nsec: 0 }, "America/Phoenix")).toBe("5:00:01.000 PM MST");
    expect(time.formatTime({ sec: 1, nsec: 1 }, "America/Detroit")).toBe("7:00:01.000 PM EST");
    expect(time.formatTime({ sec: 1, nsec: 999999999 }, "America/Phoenix")).toBe("5:00:01.999 PM MST");
    expect(time.formatTime({ sec: 1, nsec: 1000000000 }, "America/Los_Angeles")).toBe("4:00:02.000 PM PST");
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
    expect(time.parseRosTimeStr("1.12")).toEqual({ sec: 1, nsec: 12 });
    expect(time.parseRosTimeStr("100.100")).toEqual({ sec: 100, nsec: 100 });
    expect(time.parseRosTimeStr("100")).toEqual({ sec: 100, nsec: 0 });
  });
});

describe("time.parseTimeStr", () => {
  // create the time string input from current time zone so the test results are always consistent
  // sample output: 2018-07-23 2:45:20.317 PM PDT
  function getCombinedTimeStr(timestamp) {
    return `${time.formatDate(timestamp)} ${time.formatTime(timestamp)}`;
  }

  it("returns null if the input string is formatted incorrectly", () => {
    expect(time.parseTimeStr("")).toEqual(null);
    expect(time.parseTimeStr("018-07")).toEqual(null);
    expect(time.parseTimeStr("0")).toEqual(null);
  });

  it("returns the correct time", () => {
    const timeStr = getCombinedTimeStr({ sec: 1532382320, nsec: 317124567 });
    expect(time.parseTimeStr(timeStr)).toEqual({
      nsec: 317000000, // losing some accuracy when converting back
      sec: 1532382320,
    });
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
