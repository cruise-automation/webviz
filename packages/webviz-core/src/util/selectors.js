// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { intersection, keyBy } from "lodash";
import microMemoize from "micro-memoize";
import { createSelectorCreator, defaultMemoize, createSelector } from "reselect";
import shallowequal from "shallowequal";

import type { Topic } from "webviz-core/src/players/types";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";
import { SECOND_SOURCE_PREFIX } from "webviz-core/src/util/globalConstants";

export const getTopicNames = createSelector<*, *, *, _>(
  (topics: Topic[]) => topics,
  (topics: Topic[]): string[] => topics.map((topic) => topic.name)
);

export const getSanitizedTopics = microMemoize(
  (subscribedTopics: Set<string>, providerTopics: Topic[]): string[] => {
    return intersection(Array.from(subscribedTopics), providerTopics.map(({ name }) => name));
  }
);

export function getTopicPrefixes(topics: string[]): string[] {
  // only support one prefix now, can add more such as `/webviz_bag_3` later
  return topics.some((topic) => topic.startsWith(SECOND_SOURCE_PREFIX)) ? [SECOND_SOURCE_PREFIX] : [];
}

export const getTopicsByTopicName = createSelector<*, *, *, _>(
  (topics: Topic[]) => topics,
  (topics: Topic[]): { [string]: Topic } => {
    return keyBy(topics, ({ name }) => name);
  }
);

// Only exported for tests
export const constantsByDatatype = createSelector<*, *, *, _>(
  (datatypes: RosDatatypes) => datatypes,
  (datatypes: RosDatatypes): { [string]: { [mixed]: string } } => {
    const results = {};
    for (const datatype of Object.keys(datatypes)) {
      results[datatype] = {};
      for (const field of datatypes[datatype].fields) {
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

// webviz enum annotations are of the form: "Foo__webviz_enum" (notice double underscore)
// This method returns type name from "Foo" or undefined name doesn't match this format
export function extractTypeFromWebizEnumAnnotation(name: string) {
  const match = /(.*)__webviz_enum$/.exec(name);
  if (match) {
    return match[1];
  }
  return undefined;
}

// returns a map of the form {datatype -> {field -> {value -> name}}}
export const enumValuesByDatatypeAndField = createSelector<*, *, *, _>(
  (datatypes: RosDatatypes) => datatypes,
  (datatypes: RosDatatypes): { [string]: { [string]: { [mixed]: string } } } => {
    const results = {};
    for (const datatype of Object.keys(datatypes)) {
      const currentResult = {};
      // keep track of parsed constants
      let constants: { [mixed]: string } = {};
      // constants' types
      let lastType;
      for (const field of datatypes[datatype].fields) {
        if (lastType && field.type !== lastType) {
          // encountering new type resets the accumulated constants
          constants = {};
          lastType = undefined;
        }

        if (field.isConstant) {
          lastType = field.type;
          if (constants[field.value]) {
            constants[field.value] = "<multiple constants match>";
          } else {
            constants[field.value] = field.name;
          }
          continue;
        }
        // check if current field is annotation of the form: "Foo bar__webviz_enum"
        // This means that "bar" is enum of type "Foo"
        const fieldName = extractTypeFromWebizEnumAnnotation(field.name);
        if (fieldName) {
          // associate all constants of type field.type with the annotated field
          currentResult[fieldName] = constantsByDatatype(datatypes)[field.type];
          continue;
        }

        // this field was already covered by annotation, skip it
        if (currentResult[field.name]) {
          continue;
        }

        // otherwise assign accumulated constants for that field
        if (Object.keys(constants).length > 0) {
          currentResult[field.name] = constants;
        }
        // and start over - reset constants
        constants = {};
      }
      // only assign result if we found non-empty mapping into constants
      if (Object.keys(currentResult).length > 0) {
        results[datatype] = currentResult;
      }
    }
    return results;
  }
);

export const shallowEqualSelector = createSelectorCreator(defaultMemoize, shallowequal);
