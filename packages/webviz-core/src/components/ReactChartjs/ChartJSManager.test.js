// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { printShortNumber } from "./ChartJSManager";

describe("printShortNumber", () => {
  it("Renders zero correctly", () => {
    expect(printShortNumber(0)).toBe("0");
    expect(printShortNumber(-0)).toBe("0");
  });

  it("Works for small numbers", () => {
    expect(printShortNumber(0.00000123456789)).toBe("1.23e-6");
    expect(printShortNumber(0.0000123456789)).toBe("0.00001");
    expect(printShortNumber(0.000123456789)).toBe("0.00012");
    expect(printShortNumber(0.00123456789)).toBe("0.00123");
    expect(printShortNumber(0.0123456789)).toBe("0.01235");

    expect(printShortNumber(-0.00000123456789)).toBe("-1.23e-6");
    expect(printShortNumber(-0.0000123456789)).toBe("-0.00001");
    expect(printShortNumber(-0.000123456789)).toBe("-0.00012");
    expect(printShortNumber(-0.00123456789)).toBe("-0.00123");
    expect(printShortNumber(-0.0123456789)).toBe("-0.01235");
  });

  it("Works for larger numbers", () => {
    expect(printShortNumber(0.123456789)).toBe("0.12346");
    expect(printShortNumber(1.23456789)).toBe("1.23457");
    expect(printShortNumber(12.3456789)).toBe("12.3457");
    expect(printShortNumber(123.456789)).toBe("123.457");
    expect(printShortNumber(1234.56789)).toBe("1234.57");
    expect(printShortNumber(12345.6789)).toBe("12345.7");
    expect(printShortNumber(123456.789)).toBe("1.23e5");

    expect(printShortNumber(-0.123456789)).toBe("-0.12346");
    expect(printShortNumber(-1.23456789)).toBe("-1.23457");
    expect(printShortNumber(-12.3456789)).toBe("-12.3457");
    expect(printShortNumber(-123.456789)).toBe("-123.457");
    expect(printShortNumber(-1234.56789)).toBe("-1234.57");
    expect(printShortNumber(-12345.6789)).toBe("-12345.7");
    expect(printShortNumber(-123456.789)).toBe("-1.23e5");
  });
});
