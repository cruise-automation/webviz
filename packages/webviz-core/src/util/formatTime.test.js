// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as formatTime from "./formatTime";

describe("formatTime.formatDate", () => {
  it("formats date based on provided timezone", () => {
    expect(formatTime.formatDate({ sec: 1, nsec: 0 }, "Asia/Bangkok")).toBe("1970-01-01");
    expect(formatTime.formatDate({ sec: 1, nsec: 1 }, "Australia/Currie")).toBe("1970-01-01");
    expect(formatTime.formatDate({ sec: 1000000, nsec: 0 }, "Pacific/Midway")).toBe("1970-01-12");
    expect(formatTime.formatDate({ sec: 1100000, nsec: 1000000000 }, "America/Los_Angeles")).toBe("1970-01-13");
  });
});

describe("formatTime.formatDuration", () => {
  it("uses milliseconds and pads values with zeros", () => {
    expect(formatTime.formatDuration({ sec: 0, nsec: 0 })).toEqual("0:00:00.000");
    expect(formatTime.formatDuration({ sec: 0, nsec: 999 })).toEqual("0:00:00.000");
    expect(formatTime.formatDuration({ sec: 0, nsec: 1000 })).toEqual("0:00:00.000");
    expect(formatTime.formatDuration({ sec: 0, nsec: 499999 })).toEqual("0:00:00.000");
    expect(formatTime.formatDuration({ sec: 0, nsec: 500000 })).toEqual("0:00:00.001");
    expect(formatTime.formatDuration({ sec: 0, nsec: 999e3 })).toEqual("0:00:00.001");
    expect(formatTime.formatDuration({ sec: 0, nsec: 999e6 })).toEqual("0:00:00.999");
    expect(formatTime.formatDuration({ sec: 1, nsec: 999e6 })).toEqual("0:00:01.999");
    expect(formatTime.formatDuration({ sec: 1, nsec: 999999e3 })).toEqual("0:00:02.000");
    expect(formatTime.formatDuration({ sec: 1, nsec: 999999999 })).toEqual("0:00:02.000");
    expect(formatTime.formatDuration({ sec: 3 * 60 * 60 + 2 * 60 + 1, nsec: 999e6 })).toEqual("3:02:01.999");
    expect(formatTime.formatDuration({ sec: 3 * 60 * 60 + 59 * 60 + 59, nsec: 99e6 })).toEqual("3:59:59.099");
    expect(formatTime.formatDuration({ sec: -1, nsec: 0 })).toEqual("-0:00:01.000");
    expect(formatTime.formatDuration({ sec: 0, nsec: -1000000 })).toEqual("-0:00:00.001");
  });
});

describe("formatTime.formatTime", () => {
  it("formats time based on provided timezone", () => {
    expect(formatTime.formatTime({ sec: 1, nsec: 0 }, "America/Phoenix")).toBe("5:00:01.000 PM MST");
    expect(formatTime.formatTime({ sec: 1, nsec: 1 }, "America/Detroit")).toBe("7:00:01.000 PM EST");
    expect(formatTime.formatTime({ sec: 1, nsec: 999999999 }, "America/Phoenix")).toBe("5:00:01.999 PM MST");
    expect(formatTime.formatTime({ sec: 1, nsec: 1000000000 }, "America/Los_Angeles")).toBe("4:00:02.000 PM PST");
  });
});

describe("formatTime.parseTimeStr", () => {
  // create the time string input from current time zone so the test results are always consistent
  // sample output: 2018-07-23 2:45:20.317 PM PDT
  function getCombinedTimeStr(timestamp) {
    return `${formatTime.formatDate(timestamp)} ${formatTime.formatTime(timestamp)}`;
  }

  it("returns null if the input string is formatted incorrectly", () => {
    expect(formatTime.parseTimeStr("")).toEqual(null);
    expect(formatTime.parseTimeStr("018-07")).toEqual(null);
    expect(formatTime.parseTimeStr("0")).toEqual(null);
  });

  it("returns the correct time", () => {
    const originalTime = { sec: 1532382320, nsec: 317124567 };
    const timeStr = getCombinedTimeStr(originalTime);
    expect(formatTime.parseTimeStr(timeStr)).toEqual({
      nsec: 317000000, // losing some accuracy when converting back
      sec: originalTime.sec,
    });

    const timeObjInDifferentTimezone = formatTime.parseTimeStr(timeStr, "America/Detroit");
    expect(timeObjInDifferentTimezone?.nsec).toEqual(317000000); // losing some accuracy when converting back

    // Get numeric sec value that is not equal to originalTime's sec value
    expect(timeObjInDifferentTimezone?.sec).not.toBeNaN();
    expect(timeObjInDifferentTimezone?.sec).not.toEqual(originalTime.sec);
  });
});
