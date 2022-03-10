// @flow
//
//  Copyright (c) 2021-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";

import ZaplibVersion from ".";
import PanelSetup from "webviz-core/src/stories/PanelSetup";
import { storiesWithVariantsOf, withExperimentalFeatureVariants } from "webviz-core/src/stories/storyHelpers";
import { ZaplibContextProvider } from "webviz-core/src/util/ZaplibContext";

storiesWithVariantsOf("<ZaplibVersion>", module, withExperimentalFeatureVariants("zaplib", ["alwaysOn", "alwaysOff"]))
  .addParameters({
    screenshot: {
      delay: 2000,
    },
  })
  .add("show version", () => {
    return (
      <PanelSetup fixture={{ topics: [], datatypes: {}, frame: {} }}>
        <ZaplibContextProvider>
          <ZaplibVersion />
        </ZaplibContextProvider>
      </PanelSetup>
    );
  });
