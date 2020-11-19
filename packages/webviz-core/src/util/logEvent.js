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

let eventNames: ?{ +[string]: string };
let eventTags: ?{ +[string]: string };

// We can't set the event names/tags in a web worker because that would require creating a different worker for every
// proprietary / open source worker. Just throw an error in a worker.

export function getEventNames(): { +[string]: string } {
  if (eventNames == null) {
    throw new Error("Tried to get event names before they were set or tried to get event names in a web worker");
  }
  return eventNames;
}
export function getEventTags(): { +[string]: string } {
  if (eventTags == null) {
    throw new Error("Tried to get event tags before they were set or tried to get event tags in a web worker");
  }
  return eventTags;
}

let logEventImpl: ({| name: string, tags: Tags |}) => void;

export function initializeLogEvent(
  initialLogEvent: ({| name: string, tags: Tags |}) => void,
  initialEventNames?: {},
  initialEventTags?: {}
) {
  if (logEventImpl && process.env.NODE_ENV !== "test") {
    throw new Error("logEvent has already been set, it can only be set once");
  }
  logEventImpl = initialLogEvent;
  if (initialEventNames) {
    eventNames = initialEventNames;
  }
  if (initialEventTags) {
    eventTags = initialEventTags;
  }
}

export default function logEvent(params: {| name: string, tags: Tags |}) {
  if (!logEventImpl) {
    throw new Error("logEvent has been called but it has not yet been initialized");
  }
  logEventImpl(params);
}

export function resetLogEventForTests() {
  logEventImpl = () => {};
  eventNames = {};
  eventTags = {};
}
