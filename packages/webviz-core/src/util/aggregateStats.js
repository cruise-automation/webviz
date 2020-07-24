// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { every } from "lodash";

export default function aggregateStats(stats: any): any {
  // Add all numeric stat values together.
  const addedStats = stats.reduce((accumulator, stat) => {
    Object.keys(stat).forEach((key) => {
      if (typeof stat[key] === "number") {
        accumulator[key] = accumulator[key] || 0;
        accumulator[key] += stat[key];
      }
    });
    return accumulator;
  }, {});
  // Then divide by the number of stats.
  Object.keys(addedStats).forEach((key) => {
    const mean = addedStats[key] / stats.length;
    addedStats[key] = mean;
    if (every(stats, (obj) => typeof obj[key] === "number")) {
      addedStats[`${key}_stddev`] = Math.sqrt(
        stats.map((obj) => Math.pow(obj[key] - mean, 2)).reduce((a, b) => a + b) / stats.length
      );
    }
  });
  return addedStats;
}
