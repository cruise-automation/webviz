// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";

import { EXPERIMENTAL_FEATURES_STORAGE_KEY, getExperimentalFeatureSettings } from "./storage";
import type { FeatureValue, FeatureStorage, FeatureSettings } from "./types";
import { getEventInfos, logEventAction } from "webviz-core/src/util/logEvent";
import Storage from "webviz-core/src/util/Storage";

let subscribedComponents: (() => void)[] = [];

// Just exported for 3D panel worker context. Use not recommended.
export function useAllExperimentalFeatures(): FeatureSettings {
  const [settings, setSettings] = React.useState<FeatureSettings>(() => getExperimentalFeatureSettings());
  React.useEffect(() => {
    function update() {
      setSettings(getExperimentalFeatureSettings());
    }
    subscribedComponents.push(update);
    return () => {
      subscribedComponents = subscribedComponents.filter((fn) => fn !== update);
    };
  }, []);

  return settings;
}

export function useExperimentalFeature(id: string): boolean {
  const settings = useAllExperimentalFeatures();
  if (!settings[id]) {
    return false;
  }
  return settings[id].enabled;
}

export function setExperimentalFeatures(features: FeatureStorage): void {
  Object.keys(features).forEach((key) => setExperimentalFeature(key, features[key]));
}

export function setExperimentalFeature(id: string, value: FeatureValue): void {
  const storage = new Storage();
  const newSettings = { ...storage.getItem(EXPERIMENTAL_FEATURES_STORAGE_KEY) };

  logEventAction(getEventInfos().CHANGE_EXPERIMENTAL_FEATURE, { feature: id, value });

  if (value === "default") {
    delete newSettings[id];
  } else {
    newSettings[id] = value;
  }
  storage.setItem(EXPERIMENTAL_FEATURES_STORAGE_KEY, newSettings);
  for (const update of subscribedComponents) {
    update();
  }
}
