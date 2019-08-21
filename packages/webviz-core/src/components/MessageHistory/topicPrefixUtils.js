// @flow
//
//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import microMemoize from "micro-memoize";

import type { Topic } from "webviz-core/src/types/players";

export const getFilteredFormattedTopics: (topics: Topic[], currentTopicPrefix: string) => Topic[] = microMemoize(
  (topics: Topic[], currentTopicPrefix: string): Topic[] => {
    const filteredTopics = topics.filter((topic) => topic.name.startsWith(currentTopicPrefix));
    return filteredTopics.map((topic) => ({
      ...topic,
      name: topic.name.slice(currentTopicPrefix.length),
    }));
  },
  { maxSize: 10 }
);
