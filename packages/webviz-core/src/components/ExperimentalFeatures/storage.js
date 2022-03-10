// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { FeatureDescriptions, FeatureStorage, FeatureSettings } from "./types";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import Storage from "webviz-core/src/util/Storage";

export const EXPERIMENTAL_FEATURES_STORAGE_KEY = "experimentalFeaturesSettings";

export function getExperimentalFeaturesList(): FeatureDescriptions {
  return getGlobalHooks().experimentalFeaturesList();
}

export function getDefaultKey(): "productionDefault" | "developmentDefault" {
  return process.env.NODE_ENV === "production" ? "productionDefault" : "developmentDefault";
}

export function getExperimentalFeatureFromLocalStorage() {
  return new Storage().getItem<FeatureStorage>(EXPERIMENTAL_FEATURES_STORAGE_KEY) || {};
}

export function getExperimentalFeatureSettings(): FeatureSettings {
  const experimentalFeaturesList = getExperimentalFeaturesList();
  const settings: FeatureSettings = {};
  const featureStorage = getExperimentalFeatureFromLocalStorage();
  for (const id in experimentalFeaturesList) {
    if (["alwaysOn", "alwaysOff"].includes(featureStorage[id])) {
      settings[id] = { enabled: featureStorage[id] === "alwaysOn", manuallySet: true };
    } else {
      settings[id] = { enabled: experimentalFeaturesList[id][getDefaultKey()], manuallySet: false };
    }
  }
  return settings;
}

// NOT RECOMMENDED! Whenever possible, use `useExperimentalFeature`, since that will make sure that
// the UI automatically rerenders when a feature is toggled. Only use `getExperimentalFeature` for
// features that are not closely tied to React.
export function getExperimentalFeature(id: string): boolean {
  const settings = getExperimentalFeatureSettings();
  if (!settings[id]) {
    return false;
  }
  return settings[id].enabled;
}
