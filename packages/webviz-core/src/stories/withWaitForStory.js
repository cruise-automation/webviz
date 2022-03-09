// @flow
//
//  Copyright (c) 2021-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { flatten } from "lodash";
import React, { useEffect } from "react";

import waitForFonts from "webviz-core/src/styles/waitForFonts";

const promisesByEvent = {};

export const getGlobalStoryWaitFor = () => Promise.all(flatten(Object.values(promisesByEvent)));

export const StoryWaitForContext = React.createContext<{
  waitFor: (Promise<any>) => void,
  clearPromises: () => void,
}>({
  waitFor: () => {},
  clearPromises: () => {},
});

const AsyncStoryWrapper = (props: any) => {
  const waitFor = React.useCallback((promise, eventName = "DEFAULT") => {
    (promisesByEvent[eventName] = promisesByEvent[eventName] || []).push(promise);
  }, []);

  const clearPromises = React.useCallback(() => {
    const keys = Object.keys(promisesByEvent);
    keys.forEach((key) => delete promisesByEvent[key]);
  }, []);

  useEffect(() => {
    waitFor(waitForFonts()); // Always wait for fonts.

    return () => {
      clearPromises();
    };
  }, [clearPromises, waitFor]);

  const value = React.useMemo(() => ({ waitFor, clearPromises }), [clearPromises, waitFor]);

  return (
    <StoryWaitForContext.Provider value={value}>
      {React.createElement(props.storyComponent)}
    </StoryWaitForContext.Provider>
  );
};

export function withAsyncStoryDelay(storyComponent: any) {
  return <AsyncStoryWrapper storyComponent={storyComponent} />;
}

export const useScreenshotWaitFor = () => {
  const { waitFor } = React.useContext(StoryWaitForContext);
  return waitFor;
};

export const useScreenshotWaitForFn = (fn: () => Promise<any>) => {
  const waitFor = useScreenshotWaitFor();
  const readyRef = React.useRef(false);
  if (!readyRef.current) {
    waitFor(fn());
  }
};
