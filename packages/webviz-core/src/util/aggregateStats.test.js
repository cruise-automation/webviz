// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import aggregateStats from "./aggregateStats";

describe("aggregateStats", () => {
  it("Aggregates only numeric stats", () => {
    const aggregated = aggregateStats([{ number: 1, array: [] }, { number: 3, array: [] }, { number: 5, array: [] }]);

    expect(aggregated).toEqual({ number: 3, number_stddev: 1.632993161855452 });
  });
});
