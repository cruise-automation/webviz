// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import React from "react";
import { MemoryRouter } from "react-router";

import HelpModal from "webviz-core/src/components/HelpModal";

const stories = storiesOf("Help pages", module);

export function makeHelpPageStories(req: any) {
  const helpData = req.keys().map((name) => ({ name, data: req(name) }));

  helpData.forEach(({ name, data }) => {
    stories.add(name, () => (
      <MemoryRouter>
        <HelpModal onRequestClose={() => {}}>{data.default ? React.createElement(data.default) : data}</HelpModal>
      </MemoryRouter>
    ));
  });
}

// $FlowFixMe -- Flow doesn't seem to understand require.context properly.
makeHelpPageStories(require.context("../", true, /\.help\.(js|md)$/));
