// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { flatten } from "lodash";
import { join as pathJoin } from "path";

// Joins arrays of topics with proper slashes similar to node's path.join
export const joinTopics = (...topics: string[]) => {
  const joinedTopics = pathJoin(...topics);
  return joinedTopics.startsWith("/") ? joinedTopics : `/${joinedTopics}`;
};

export const addTopicPrefix = (topics: string[], prefix: string): string[] => {
  return topics.map<string>((topic) => joinTopics(prefix, topic));
};

// Calculates the cartesian product of arrays of topics
export const makeTopicCombos = (...topicGroups: string[][]): string[] => {
  const topicArrays = cartesianProduct(topicGroups);
  return topicArrays.map((topics) => joinTopics(...topics));
};

// Calculates the cartesianProduct of arrays of elements
// Inspired by https://gist.github.com/tansongyang/9695563ad9f1fa5309b0af8aa6b3e7e3
// ["foo", "bar"], ["cool", "beans"]] => [["foo", "cool"],["foo", "beans"],["bar", "cool"],["bar", "beans"],]
export function cartesianProduct<T>(arrays: T[][]): T[][] {
  return arrays.reduce(
    (a, b) => {
      return flatten<T[], T[]>(
        a.map((x) => {
          return b.map((y) => {
            return x.concat([y]);
          });
        })
      );
    },
    [[]]
  );
}
