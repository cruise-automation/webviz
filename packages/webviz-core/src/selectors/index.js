// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { createSelectorCreator, defaultMemoize, createSelector } from "reselect";
import shallowequal from "shallowequal";

import type { Topic } from "webviz-core/src/types/players";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";

export const getTopicNames = createSelector<*, *, *, _>(
  (topics: Topic[]) => topics,
  (topics: Topic[]): string[] => topics.map((topic) => topic.name)
);

export const topicsByTopicName = createSelector<*, *, *, _>(
  (topics: Topic[]) => topics,
  (topics: Topic[]): { [string]: Topic } => {
    const results = {};
    for (const topic of topics) {
      results[topic.name] = topic;
    }
    return results;
  }
);

export const constantsByDatatype = createSelector<*, *, *, _>(
  (datatypes: RosDatatypes) => datatypes,
  (datatypes: RosDatatypes): { [string]: { [mixed]: string } } => {
    const results = {};
    for (const datatype of Object.keys(datatypes)) {
      results[datatype] = {};
      for (const field of datatypes[datatype]) {
        if (field.isConstant) {
          if (results[datatype][field.value]) {
            results[datatype][field.value] = "<multiple constants match>";
          } else {
            results[datatype][field.value] = field.name;
          }
        }
      }
    }
    return results;
  }
);

export const shallowEqualSelector = createSelectorCreator(defaultMemoize, shallowequal);
