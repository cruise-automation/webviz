// @flow
//
//  Copyright (c) 2021-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { set } from "lodash";

import { logEventAction, getEventInfos, logEventPerformance } from "webviz-core/src/util/logEvent";

const batchTimerDelay = 60000; // send events every 60s
let state: {
  [eventName: string]: { [tagPath: string]: { [eventType: "action" | "performance"]: { [string]: string | number } } },
} = {};
let timer;

const buildTagPathFromTags = (eventType: string, unaggregatedTags: { [string]: string }): string =>
  Object.keys(unaggregatedTags)
    .sort() // sort keys so we can guarantee consistent path names
    .map((key) => `${key}:${unaggregatedTags[key]}`)
    .join(".") + eventType;

// send one event for each permutation of log data, with the occurence count
function sendEvents() {
  for (const eventName in state) {
    for (const path in state[eventName]) {
      if (state[eventName][path].action) {
        logEventAction(getEventInfos()[eventName], state[eventName][path].action);
      }
      if (state[eventName][path].performance) {
        logEventPerformance(getEventInfos()[eventName], 0, state[eventName][path].performance);
      }
    }
  }

  // clear out timer and state so the next logged event starts fresh
  timer = null;
  state = {};
}

// Always send a batched event when the user closes the page.
function beforeUnload() {
  sendEvents();
}
window.addEventListener("beforeunload", beforeUnload);

function aggregateAndStoreData(
  eventType: "action" | "performance",
  eventName: string,
  unaggregatedTags: { [string]: string },
  newAggregatedLogData: { [string]: number }
): void {
  // this lets us pull out event names while keeping paths unique
  // example result: { SEEK_RELATIVE: { "FROM:CLICK.TYPE:10ms": logData } }
  const tagPath = buildTagPathFromTags(eventType, unaggregatedTags);

  // logData is the object that is sent to analytics.
  const logData = state?.[eventName]?.[tagPath]?.[eventType] || { ...unaggregatedTags };
  set(state, [eventName, tagPath, eventType], logData);

  // Sum the aggregated log data by key with the existing logData.
  for (const aggregateKey in newAggregatedLogData) {
    if (!logData[aggregateKey]) {
      logData[aggregateKey] = newAggregatedLogData[aggregateKey];
    } else {
      logData[aggregateKey] += newAggregatedLogData[aggregateKey];
    }
  }
}

// Calling logBatchedEventTotals will batch events by unaggregatedTags. It will sum the
// data in newAggregatedLogData by key and report it on an interval or whenever the user
// closes the page.
export function logBatchedEventTotals(
  eventType: "action" | "performance",
  eventName: string,
  // Each unique set of unaggregated tags results in a new event.
  unaggregatedTags: { [string]: string },
  // For each event, we sum this data by key.
  newAggregatedLogData: { [string]: number }
): TimeoutID {
  if (!timer) {
    timer = setTimeout(sendEvents, batchTimerDelay);
  }

  aggregateAndStoreData(eventType, eventName, unaggregatedTags, newAggregatedLogData);

  // return timer id in case we want to cancel it
  return timer;
}
