// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";

import delay from "webviz-core/shared/delay";
import signal, { type Signal } from "webviz-core/shared/signal";
import inScreenshotTests from "webviz-core/src/stories/inScreenshotTests";

export type StoryEventsContextType = $ReadOnly<{
  ready: Signal<void>,
  render: Signal<void>,
  selection: Signal<void>,

  // Manually resolved by stories (optional)
  storyCompleted: Signal<void>,
}>;

const StoryEventsContext = React.createContext<?StoryEventsContextType>();

export function useStoryEventsContext(): ?StoryEventsContextType {
  return React.useContext(StoryEventsContext);
}

// If we're running screenshot tests, we need to increase the delay times in order to
// ensure that everything is rendered correctly. Otherwise, be as fast as possible
const DEFAULT_DELAY_AFTER_WAIT = inScreenshotTests() ? 2000 : 100;

export const waitFor3dPanelEvent = (eventName: string, delayMs: number = DEFAULT_DELAY_AFTER_WAIT) => {
  const worldEvents = {};

  const withStoryEventContext = (StoryType: any) => {
    // Create signals here because `waitFor3dPanelEvent` is called only once during story setup.
    // Otherwise, switching stories in Storyboard is not possible.
    worldEvents.ready = signal<void>();
    worldEvents.render = signal<void>();
    worldEvents.selection = signal<void>();
    worldEvents.storyCompleted = signal<void>();

    return (
      <StoryEventsContext.Provider value={worldEvents}>
        <StoryType />
      </StoryEventsContext.Provider>
    );
  };

  return {
    decorators: [withStoryEventContext],
    screenshot: {
      waitFor: () => worldEvents[eventName].then(() => delay(delayMs)),
    },
  };
};

export const waitFor3dPanelReadyEvent = (delayMs: number = DEFAULT_DELAY_AFTER_WAIT) => {
  return waitFor3dPanelEvent("ready", delayMs);
};

export const waitFor3dPanelRenderEvent = (delayMs: number = DEFAULT_DELAY_AFTER_WAIT) => {
  return waitFor3dPanelEvent("render", delayMs);
};

export const waitFor3dPanelSelectionEvent = (delayMs: number = DEFAULT_DELAY_AFTER_WAIT) => {
  return waitFor3dPanelEvent("selection", delayMs);
};

export const waitForStoryCompletedEvent = (delayMs: number = DEFAULT_DELAY_AFTER_WAIT) => {
  return waitFor3dPanelEvent("storyCompleted", delayMs);
};

export const use3dPanelEvent = (eventName: string, delayMs: number = DEFAULT_DELAY_AFTER_WAIT) => {
  const worldEvents = useStoryEventsContext();
  return React.useMemo(() => {
    if (!worldEvents) {
      return Promise.reject();
    }
    const event = worldEvents[eventName];
    return delayMs === 0 ? event : event.then(() => delay(delayMs));
  }, [delayMs, eventName, worldEvents]);
};

export const use3dPanelReadyEvent = (delayMs: number = DEFAULT_DELAY_AFTER_WAIT) => {
  return use3dPanelEvent("ready", delayMs);
};

export const use3dPanelRenderEvent = (delayMs: number = DEFAULT_DELAY_AFTER_WAIT) => {
  return use3dPanelEvent("render", delayMs);
};

export const use3dPanelSelectionEvent = (delayMs: number = DEFAULT_DELAY_AFTER_WAIT) => {
  return use3dPanelEvent("selection", delayMs);
};

export const useStoryCompletedEvent = (): Signal<void> => {
  const worldEvents = useStoryEventsContext();
  if (!worldEvents) {
    throw new Error("Attempting to use world events outside of context provider");
  }
  return worldEvents.storyCompleted;
};
