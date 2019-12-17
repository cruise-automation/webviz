// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// Fuzzy matching: allow filter "fzmg" to match "fuzzy/matching".
// Score by how early in the string matches appear.
export default function fuzzyFilter<T>(
  options: T[],
  filter: ?string,
  getText: (T) => string = (x: any) => x,
  sort: boolean = true
): T[] {
  if (!filter) {
    return options;
  }
  const needle = filter.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (needle.length === 0) {
    return options;
  }

  type Result = {| option: T, score: number |};
  const results: Result[] = [];

  for (const option of options) {
    const haystack = getText(option).toLowerCase();
    let charPos = -1;
    let score = 0;
    for (const char of needle) {
      charPos = haystack.indexOf(char, charPos + 1);
      if (charPos === -1) {
        break;
      }
      score += charPos;
    }
    if (charPos !== -1) {
      results.push({
        option,
        score: score * haystack.length,
      });
    }
  }

  if (sort) {
    results.sort((a, b) => a.score - b.score);
  }
  return results.map((result: Result): T => result.option);
}
