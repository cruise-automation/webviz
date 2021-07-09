// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf, type Story } from "@storybook/react";

import { waitFor3dPanelEvent } from "./waitFor3dPanelEvents";

const storiesWithEventsOf = (baseName: string, module: NodeModule, defaultEventName: string = "render"): Story => {
  const stories = storiesOf(baseName, module);

  const fakeStoriesOf = {
    kind: "story",
    add: (...args) => {
      if (args.length > 2) {
        // we've got more than just a story name and callback. Probably
        // extra parameters, so let's assume the story is already setup
        // with all of the events it needs to wait for
        stories.add(...args);
      } else {
        const [storyName, callback] = args;
        stories.add(storyName, callback, waitFor3dPanelEvent(defaultEventName));
      }
      return fakeStoriesOf;
    },
    addDecorator: (...args) => {
      stories.addDecorator(...args);
      return fakeStoriesOf;
    },
    addParameters: (...args) => {
      stories.addParameters(...args);
      return fakeStoriesOf;
    },
  };

  return fakeStoriesOf;
};

export default storiesWithEventsOf;
