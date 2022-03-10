// @flow
//
//  Copyright (c) 2021-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

const SUFFIX_DETECTORS = {
  PARENTHESES: {
    regex: /^(.*)\((\d+)\)$/,
    format: ({ prefix, index }) => `${prefix}(${index})`,
  },
  UNDERSCORE: {
    regex: /^(.*)_(\d+)$/,
    format: ({ prefix, index }) => `${prefix}_${index}`,
  },
};

const detectSuffix = (s, regex) => {
  const match = s.match(regex);
  if (match) {
    return { prefix: match[1], index: Number(match[2]) };
  }
  return { prefix: s, index: 0 };
};

export default class UniqueLabelGenerator {
  _allIndicesPerLabel: { [string]: Set<number> } = {}; // to detect conflicts
  _nextIndexPerLabel: { [string]: number } = {}; // for suggestions on conflict
  _regex: RegExp;
  _format: ({ prefix: string, index: number }) => string;

  constructor(labels: string[] = [], format: "PARENTHESES" | "UNDERSCORE" = "PARENTHESES") {
    this._regex = SUFFIX_DETECTORS[format].regex;
    this._format = SUFFIX_DETECTORS[format].format;
    labels.forEach((label) => {
      this.addLabel(label);
    });
  }

  // Don't try to detect or resolve conflicts.
  addLabel(label: string) {
    const { prefix, index } = detectSuffix(label, this._regex);
    if (this._allIndicesPerLabel[prefix] == null) {
      this._allIndicesPerLabel[prefix] = new Set();
    }
    this._allIndicesPerLabel[prefix].add(index);
    if (this._nextIndexPerLabel[prefix] == null || this._nextIndexPerLabel[prefix] < index + 1) {
      this._nextIndexPerLabel[prefix] = index + 1;
    }
  }

  suggestLabel(label: string) {
    const { prefix, index } = detectSuffix(label, this._regex);
    if (this._allIndicesPerLabel[prefix] && this._allIndicesPerLabel[prefix].has(index)) {
      const nextIndex = this._nextIndexPerLabel[prefix];
      return this._format({ prefix, index: nextIndex });
    }
    return label;
  }
}
