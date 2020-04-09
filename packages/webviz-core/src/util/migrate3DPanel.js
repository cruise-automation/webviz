// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { cloneDeep } from "lodash";

import type { ThreeDimensionalVizConfig } from "webviz-core/src/panels/ThreeDimensionalViz";
import {
  migratePanelConfigToTopicGroupConfig,
  addDefaultTopicSettings,
} from "webviz-core/src/panels/ThreeDimensionalViz/TopicGroups/topicGroupsMigrations";

// change this as needed to provide backward compatibility with old saved props
export const SAVED_PROPS_VERSION = 14;

export default function migrate3DPanel(config: ThreeDimensionalVizConfig): ThreeDimensionalVizConfig {
  const { checkedNodes, modifiedNamespaceTopics, topicSettings, topicGroups, savedPropsVersion } = config;

  if (savedPropsVersion === SAVED_PROPS_VERSION) {
    return config;
  }

  let newTopicGroups = cloneDeep(topicGroups || []);

  if (!savedPropsVersion || savedPropsVersion < 11) {
    newTopicGroups = newTopicGroups.concat(
      migratePanelConfigToTopicGroupConfig({ topicSettings, checkedNodes, modifiedNamespaceTopics })
    );
    newTopicGroups = addDefaultTopicSettings(newTopicGroups);
  }

  return {
    ...config,
    topicGroups: newTopicGroups,
    savedPropsVersion: SAVED_PROPS_VERSION,
  };
}
