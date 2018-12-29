// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { observeMeasures, setCallback, ID_PREFIX, REACT_PANEL_WRAPPER_MEASURE_NAME } from "./reconciliationPerf";

describe("reconciliationPerf", () => {
  it("should match measures to metrics independent of order", () => {
    // Window.performance doesn't exist while our tests run, but in case it ever does in the glorious future, keep a copy and reset the stub at the end.
    const oldPerformance = window.performance;
    window.performance = {
      clearMarks: () => {},
    };

    // Fake measures and marks:
    const list = {
      getEntries: () => [
        // Basic.
        { entryType: "measure", name: REACT_PANEL_WRAPPER_MEASURE_NAME, startTime: 1, duration: 1 },
        { entryType: "mark", name: `${ID_PREFIX}Id1`, startTime: 1.5 },

        // Mark before measure.
        { entryType: "mark", name: `${ID_PREFIX}Id2`, startTime: 7 },
        { entryType: "measure", name: REACT_PANEL_WRAPPER_MEASURE_NAME, startTime: 6, duration: 3 },

        // Floating measure that doesn't have child (so doesn't get matched).
        { entryType: "measure", name: REACT_PANEL_WRAPPER_MEASURE_NAME, startTime: 9.1, duration: 0.6 },

        // Mark & Measure together but out of order with rest.
        { entryType: "measure", name: REACT_PANEL_WRAPPER_MEASURE_NAME, startTime: 3, duration: 2 },
        { entryType: "mark", name: `${ID_PREFIX}Id3`, startTime: 4 },

        // Measure that overlaps Id3, but doesn't have the right name.
        { entryType: "measure", name: "blah", startTime: 3, duration: 2 },

        // Multiple marks first, then matching measures.
        { entryType: "mark", name: `${ID_PREFIX}Id5`, startTime: 13 },
        { entryType: "mark", name: `${ID_PREFIX}Id4`, startTime: 11 },
        { entryType: "measure", name: REACT_PANEL_WRAPPER_MEASURE_NAME, startTime: 12, duration: 6 },
        { entryType: "measure", name: REACT_PANEL_WRAPPER_MEASURE_NAME, startTime: 10, duration: 2 },
      ],
    };

    const callback1 = jest.fn();
    const callback2 = jest.fn();
    const callback3 = jest.fn();
    const callback4 = jest.fn();
    const callback5 = jest.fn();
    setCallback("Id1", callback1);
    setCallback("Id2", callback2);
    setCallback("Id3", callback3);
    setCallback("Id4", callback4);
    setCallback("Id5", callback5);

    observeMeasures(list);

    expect(callback1.mock.calls).toEqual([[expect.objectContaining({ duration: 1 })]]);
    expect(callback2.mock.calls).toEqual([[expect.objectContaining({ duration: 3 })]]);
    expect(callback3.mock.calls).toEqual([[expect.objectContaining({ duration: 2 })]]);
    expect(callback4.mock.calls).toEqual([[expect.objectContaining({ duration: 2 })]]);
    expect(callback5.mock.calls).toEqual([[expect.objectContaining({ duration: 6 })]]);

    window.performance = oldPerformance;
  });
});
