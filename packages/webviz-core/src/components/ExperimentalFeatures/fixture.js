// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import type { FeatureDescriptions, FeatureSettings, FeatureStorage } from "./types";

export const dummyExperimentalFeaturesList: FeatureDescriptions = {
  topicTree: {
    name: "Customizable topic tree",
    description:
      "We're revamping the topic tree to be customizable directly from Webviz. You'll be able to create your own groups and toggle them easily.",
    developmentDefault: true,
    productionDefault: false,
  },
  topicTree2: {
    name: "Customizable topic tree",
    description:
      "We're revamping the topic tree to be customizable directly from Webviz. You'll be able to create your own groups and toggle them easily.",
    developmentDefault: true,
    productionDefault: false,
  },
  topicTree3: {
    name: "Customizable topic tree",
    description:
      "We're revamping the topic tree to be customizable directly from Webviz. You'll be able to create your own groups and toggle them easily.",
    developmentDefault: true,
    productionDefault: false,
  },
  topicTree4: {
    name: "Customizable topic tree",
    description:
      "We're revamping the topic tree to be customizable directly from Webviz. You'll be able to create your own groups and toggle them easily.",
    developmentDefault: true,
    productionDefault: false,
  },
};

export const dummyExperimentalFeaturesSettings: FeatureSettings = {
  topicTree: { enabled: true, manuallySet: false },
  topicTree2: { enabled: false, manuallySet: false },
  topicTree3: { enabled: true, manuallySet: true },
  topicTree4: { enabled: false, manuallySet: true },
};

export const dummyExperimentalFeaturesStorage: FeatureStorage = {
  topicTree3: "alwaysOn",
  topicTree4: "alwaysOff",
};
