// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { memoize, uniq } from "lodash";
import { Parser, Grammar } from "nearley";

import type { RosPath } from "./constants";
import grammar from "./grammar.ne";
import filterMap from "webviz-core/src/filterMap";

const grammarObj = Grammar.fromCompiled(grammar);

const parseRosPath: (path: string) => ?RosPath = memoize(
  (path: string): ?RosPath => {
    // Need to create a new Parser object for every new string to parse (should be cheap).
    const parser = new Parser(grammarObj);
    try {
      return parser.feed(path).results[0];
    } catch (_) {
      return undefined;
    }
  }
);
export default parseRosPath;

export function getTopicsFromPaths(paths: string[]): string[] {
  return uniq(
    filterMap(paths, (path) => {
      const rosPath = parseRosPath(path);
      return rosPath ? rosPath.topicName : undefined;
    })
  );
}
