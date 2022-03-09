// @flow
//
//  Copyright (c) 2021-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

const suffixDetector = /(.*)\((\d+)\)$/;
const detectSuffix = (s) => {
  const match = s.match(suffixDetector);
  if (match) {
    return { prefix: match[1], index: Number(match[2]) };
  }
  return { prefix: s, index: 0 };
};

export default class UniqueLabelGenerator {
  _allIndicesPerLabel: { [string]: Set<number> } = {}; // to detect conflicts
  _nextIndexPerLabel: { [string]: number } = {}; // for suggestions on conflict
  constructor(labels: string[] = []) {
    labels.forEach((label) => {
      this.addLabel(label);
    });
  }

  // Don't try to detect or resolve conflicts.
  addLabel(label: string) {
    const { prefix, index } = detectSuffix(label);
    if (this._allIndicesPerLabel[prefix] == null) {
      this._allIndicesPerLabel[prefix] = new Set();
    }
    this._allIndicesPerLabel[prefix].add(index);
    if (this._nextIndexPerLabel[prefix] == null || this._nextIndexPerLabel[prefix] < index + 1) {
      this._nextIndexPerLabel[prefix] = index + 1;
    }
  }

  suggestLabel(label: string) {
    const { prefix, index } = detectSuffix(label);
    if (this._allIndicesPerLabel[prefix] && this._allIndicesPerLabel[prefix].has(index)) {
      return `${prefix}(${this._nextIndexPerLabel[prefix]})`;
    }
    return label;
  }
}
