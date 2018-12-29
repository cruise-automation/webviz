// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

export const ID_PREFIX = "reconciliationPerf:";
export const REACT_PANEL_WRAPPER_MEASURE_NAME = "⚛ PerfMonitor [update]";

const callbacksById: { [string]: (PerformanceEntry) => void } = {};

const entrySorter = (a: PerformanceEntry, b: PerformanceEntry) => (a.startTime < b.startTime ? -1 : 1);

export const observeMeasures = (list: window.PerformanceObserverEntryList) => {
  // General Idea:
  //  - React's performance measures don't have specifics of which measure corresponds to which exact component.
  //  - To compensate:
  //     - At the start of shouldComponentUpdate, we add a mark with a specific child Id for the component
  //     - In this function when we get all the measures together, we sort all the marks / measures by start time and:
  //       - at each measure for "⚛ PerfMonitor [update]"
  //       - The next time we see the child id mark, we know that the most recent measure was for this child id.
  //       - We store this measure in a dictionary keyed by that child id.
  //     - This works because the mark happens during the measured period, and we get the list chronologically, so you get a measure, then the marks in it.
  //     - Whenever we render the component, we see if we have a value for the previous render and show that overlaid.
  let currentMeasure = null;
  const sortedEntriesList: PerformanceEntry[] = [...list.getEntries()].sort(entrySorter);
  for (const entry of sortedEntriesList) {
    if (entry.entryType === "measure" && entry.name.startsWith(REACT_PANEL_WRAPPER_MEASURE_NAME)) {
      currentMeasure = entry;
    } else if (entry.entryType === "mark" && entry.name.startsWith(ID_PREFIX)) {
      if (!currentMeasure) {
        continue;
      }
      const id = entry.name.slice(ID_PREFIX.length);
      if (callbacksById[id]) {
        callbacksById[id](currentMeasure);
      }
      if (window.performance && window.performance.clearMarks) {
        window.performance.clearMarks(entry.name);
      }
      currentMeasure = null;
    }
  }
};

export function setupPerfMonitoring() {
  const panelPerfWatcher = new window.PerformanceObserver(observeMeasures);
  panelPerfWatcher.observe({ entryTypes: ["mark", "measure"] });
}

export const setCallback = (id: string, callback: ?(PerformanceEntry) => void) => {
  if (callback) {
    callbacksById[id] = callback;
  } else {
    delete callbacksById[id];
  }
};

export const markUpdate = (id: string) => {
  window.performance.mark(`${ID_PREFIX}${id}`);
};
