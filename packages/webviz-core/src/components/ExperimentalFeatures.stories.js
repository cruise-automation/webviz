// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import React from "react";

import { ExperimentalFeaturesModal } from "webviz-core/src/components/ExperimentalFeatures";
import {
  dummyExperimentalFeaturesList,
  dummyExperimentalFeaturesSettings,
} from "webviz-core/src/components/ExperimentalFeatures.fixture";

storiesOf("<ExperimentalFeatures>", module)
  .addParameters({
    screenshot: {
      viewport: { width: 1000, height: 1300 },
    },
  })
  .add("empty list", () => <ExperimentalFeaturesModal listForStories={{}} settingsForStories={{}} />)
  .add("basic fixture", () => (
    <ExperimentalFeaturesModal
      listForStories={dummyExperimentalFeaturesList}
      settingsForStories={dummyExperimentalFeaturesSettings}
    />
  ));
