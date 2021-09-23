// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { filterDatasets } from "./utils";

describe("filterDatasets", () => {
  it("removes hidden lines", () => {
    const datasets = [{ data: [], label: "a" }, { data: [], label: "b" }, { data: [], label: "c" }];
    const linesToHide = { a: false, b: true };
    expect(filterDatasets(datasets, linesToHide).map(({ label }) => label)).toEqual(["a", "c"]);
  });

  it("leaves string values alone", () => {
    const datasets = [
      {
        data: [{ x: 0, y: "1" }, { x: 0, y: "1" }, { x: 0, y: "2" }, { x: 0, y: "3" }],
        label: "1",
      },
    ];
    const linesToHide = {};
    expect(filterDatasets(datasets, linesToHide, 100, 100)[0].data.map(({ y }) => y)).toEqual(["1", "2", "3"]);
  });

  it("filters out points that are too close to each other", () => {
    const data = new Array(101).fill().map((_, x) => ({ y: 0, x }));
    expect(data[0]).toEqual({ y: 0, x: 0 });
    expect(data[100]).toEqual({ y: 0, x: 100 });

    const datasets = [{ data, label: "1" }];
    const linesToHide = {};
    expect(filterDatasets(datasets, linesToHide, 10, 10)[0].data.map(({ x }) => x)).toEqual([
      0,
      10,
      20,
      30,
      40,
      50,
      60,
      70,
      80,
      90,
      100,
    ]);
  });

  it("does not filter out color transition points, even if they are too close to each other", () => {
    const data = new Array(101).fill().map((_, x) => ({ y: 0, x }));
    const colors = new Array(101).fill().map((_, x) => {
      if (x < 12) {
        return "#AAA";
      }
      return "#BBB";
    });
    expect(data[0]).toEqual({ y: 0, x: 0 });
    expect(data[100]).toEqual({ y: 0, x: 100 });

    const datasets = [{ data, label: "1", colors }];
    const linesToHide = {};
    expect(filterDatasets(datasets, linesToHide, 10, 10)[0].data.map(({ x }) => x)).toEqual([
      0,
      10,
      12, // this point is where the color transitions, so it should always appear
      20,
      30,
      40,
      50,
      60,
      70,
      80,
      90,
      100,
    ]);
  });

  it("does not filter out background color transition points, even if they are too close to each other", () => {
    const data = new Array(101).fill().map((_, x) => ({ y: 0, x }));
    const pointBackgroundColor = new Array(101).fill().map((_, x) => {
      if (x < 15) {
        return "#AAA";
      }
      return "#BBB";
    });
    expect(data[0]).toEqual({ y: 0, x: 0 });
    expect(data[100]).toEqual({ y: 0, x: 100 });

    const datasets = [{ data, label: "1", pointBackgroundColor }];
    const linesToHide = {};
    expect(filterDatasets(datasets, linesToHide, 10, 10)[0].data.map(({ x }) => x)).toEqual([
      0,
      10,
      15, // this point is where the color transitions, so it should always appear
      20,
      30,
      40,
      50,
      60,
      70,
      80,
      90,
      100,
    ]);
  });

  it("does not filter out datalabel transition points, even if they are too close to each other", () => {
    const data = new Array(101).fill().map((_, x) => ({ y: 0, x }));
    const display = new Array(101).fill().map((_, x) => {
      if (x < 17) {
        return "auto";
      }
      return false;
    });
    expect(data[0]).toEqual({ y: 0, x: 0 });
    expect(data[100]).toEqual({ y: 0, x: 100 });

    const datasets = [{ data, label: "1", datalabels: { display } }];
    const linesToHide = {};
    expect(filterDatasets(datasets, linesToHide, 10, 10)[0].data.map(({ x }) => x)).toEqual([
      0,
      10,
      17, // this point is where the color transitions, so it should always appear
      20,
      30,
      40,
      50,
      60,
      70,
      80,
      90,
      100,
    ]);
  });

  it("does not filter non-array values for background colors", () => {
    const data = new Array(101).fill().map((_, x) => ({ y: 0, x }));
    const pointBackgroundColor = "#AABBCC";
    expect(data[0]).toEqual({ y: 0, x: 0 });
    expect(data[100]).toEqual({ y: 0, x: 100 });

    const datasets = [{ data, label: "1", pointBackgroundColor }];
    const linesToHide = {};
    expect(filterDatasets(datasets, linesToHide, 10, 10)[0].data.map(({ x }) => x)).toEqual([
      0,
      10,
      20,
      30,
      40,
      50,
      60,
      70,
      80,
      90,
      100,
    ]);
  });

  it("preserves non-adjacent NaNs in line charts", () => {
    const datasets = [
      {
        data: [NaN, NaN, 1, NaN, NaN, 2, NaN, NaN].map((val) => ({ x: val, y: val })),
        label: "1",
        showLine: true,
      },
    ];
    const linesToHide = {};
    expect(filterDatasets(datasets, linesToHide)[0].data.map(({ x }) => x)).toEqual([NaN, 1, NaN, 2, NaN]);
  });

  it("preserves one NaN in scatter plots", () => {
    // Any behavior would be fine here, but this is what we currently do.
    const datasets = [
      {
        data: [NaN, NaN, 1, NaN, NaN, 2, NaN, NaN].map((val) => ({ x: val, y: val })),
        label: "1",
      },
    ];
    const linesToHide = {};
    expect(filterDatasets(datasets, linesToHide)[0].data.map(({ x }) => x)).toEqual([NaN, 1, 2]);
  });
});
