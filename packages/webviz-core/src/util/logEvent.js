// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// This is a much more complex way of doing a "hook", behavior split between open-source and proprietary.
// We do it this way so that we can change the hook behavior in workers, and so we don't have to include all of the
// javascript from the hooks in each worker.

export type Tags = { +[key: string]: ?(string | boolean | number | string[] | number[]) };
export const DEFAULT_TAGS = Object.freeze({
  node_env: process.env.NODE_ENV || "unknown",
  git_sha: typeof GIT_INFO !== "undefined" && GIT_INFO ? GIT_INFO.hash : "unknown",
});

export const eventCategories = {
  CLICK: "Click",
  SUBMIT: "Submit",
  PAGE: "Page",
  ERROR: "Error",
  // Used by performance events.
  USAGE: "Usage",
  TIMING: "Timing",
};

export type EventInfo = {|
  category: $Values<typeof eventCategories>,
  humanReadableName: string,
  // Only used in error events.
  errorCode?: number,
  severityRank?: number,
|};

let eventInfos: ?{ +[string]: EventInfo };
let eventTags: ?{ +[string]: string };

// We can't set the event names/tags in a web worker because that would require creating a different worker for every
// proprietary / open source worker. Just throw an error in a worker.

export function getEventInfos(): { +[string]: EventInfo } {
  if (eventInfos == null) {
    throw new Error("Tried to get event names before they were set or tried to get event names in a web worker");
  }
  return eventInfos;
}
export function getEventTags(): { +[string]: string } {
  if (eventTags == null) {
    throw new Error("Tried to get event tags before they were set or tried to get event tags in a web worker");
  }
  return eventTags;
}

export type LogEventImpl = {|
  logEventNavigation: (
    urlCurrent: string,
    urlCurrentPathParams: { [string]: string | number },
    urlCurrentQuery: string,
    urlReferral: string,
    urlReferralPathParams: { [string]: string | number },
    urlReferralQuery: string,
    logData?: { [string]: string | number }
  ) => void,
  logEventAction: (
    uniqueActionInfo: EventInfo,
    urlCurrent: string,
    urlCurrentPathParams?: { [string]: string | number },
    urlCurrentQuery?: string,
    logData?: { [string]: string | number }
  ) => void,
  logEventPerformance: (
    uniquePerformanceInfo: EventInfo,
    eventDuration: ?number,
    urlCurrent: string,
    urlCurrentPathParams: { [string]: string | number },
    urlCurrentQuery: string,
    logData?: { [string]: string | number }
  ) => void,
  logEventError: (
    uniqueErrorInfo: EventInfo,
    urlCurrent: string,
    urlCurrentPathParams: { [string]: string | number },
    urlCurrentQuery: string,
    logData?: { [string]: string | number }
  ) => void,
|};

let logEventImpl: ?LogEventImpl;
let isLogEventDisabled = false;

export function initializeLogEvent(initialLogEvent: LogEventImpl, initialEventInfos?: {}, initialEventTags?: {}) {
  if ((logEventImpl || isLogEventDisabled) && process.env.NODE_ENV !== "test") {
    throw new Error("logEvent has already been set or disabled, it can only be set once");
  }
  logEventImpl = initialLogEvent;
  if (initialEventInfos) {
    eventInfos = initialEventInfos;
  }
  if (initialEventTags) {
    eventTags = initialEventTags;
  }
}

export function disableLogEvent() {
  if ((logEventImpl || isLogEventDisabled) && process.env.NODE_ENV !== "test") {
    throw new Error("logEvent has already been set or disabled, it can only be set once");
  }
  isLogEventDisabled = true;
  eventInfos = {};
  eventTags = {};
}

function getPath(): string {
  return location.pathname;
}
function getPathParams() {
  return {};
}
function getQuery() {
  return location.search;
}

type LogData = { +[string]: string | number | boolean | typeof undefined | null | LogData };

export function logEventAction(uniqueActionInfo: EventInfo, logData?: LogData) {
  if (isLogEventDisabled) {
    return;
  }
  if (!logEventImpl) {
    throw new Error("logEventAction has been called but it has not yet been initialized");
  }
  logEventImpl.logEventAction(uniqueActionInfo, getPath(), getPathParams(), getQuery(), {
    ...logData,
    ...DEFAULT_TAGS,
  });
}

export function logEventError(uniqueErrorInfo: EventInfo, logData?: LogData) {
  if (isLogEventDisabled) {
    return;
  }
  if (!logEventImpl) {
    throw new Error("logEventError has been called but it has not yet been initialized");
  }
  logEventImpl.logEventError(uniqueErrorInfo, getPath(), getPathParams(), getQuery(), {
    ...logData,
    ...DEFAULT_TAGS,
  });
}

export function logEventPerformance(uniquePerformanceInfo: EventInfo, eventDurationMs: ?number, logData?: LogData) {
  if (isLogEventDisabled) {
    return;
  }
  if (!logEventImpl) {
    throw new Error("logEventPerformance has been called but it has not yet been initialized");
  }
  logEventImpl.logEventPerformance(uniquePerformanceInfo, eventDurationMs, getPath(), getPathParams(), getQuery(), {
    ...logData,
    ...DEFAULT_TAGS,
  });
}

export function logEventNavigation(
  eventName: string,
  previousPath: string,
  previousPathParams: { [string]: string | number },
  previousQuery: string,
  logData?: LogData
) {
  if (isLogEventDisabled) {
    return;
  }
  if (!logEventImpl) {
    throw new Error("logEventNavigation has been called but it has not yet been initialized");
  }
  logEventImpl.logEventNavigation(
    getPath(),
    getPathParams(),
    getQuery(),
    previousPath,
    previousPathParams,
    previousQuery,
    {
      ...logData,
      ...DEFAULT_TAGS,
    }
  );
}

export function logEventForRpc(
  type: "logEventPerformance" | "logEventAction" | "logEventNavigation" | "logEventError",
  args: any[]
) {
  if (isLogEventDisabled) {
    return;
  }
  if (!logEventImpl) {
    throw new Error("logEventNavigation has been called but it has not yet been initialized");
  }
  logEventImpl[type](...args);
}

export function resetLogEventForTests() {
  logEventImpl = undefined;
  eventInfos = {};
  eventTags = {};
  isLogEventDisabled = false;
}
