// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// DUPLICATED from webviz-core/src/util to be used for frozen migrations
function getPanelIdForType(type: string): string {
  const factor = 1e10;
  const rnd = Math.round(Math.random() * factor).toString(36);
  // a panel id consists of its type, an exclimation mark for splitting, and a random val
  // because each panel id functions is the react 'key' for the react-mosiac-component layout
  // but also must encode the panel type for panel factory construction
  return `${type}!${rnd}`;
}

export default getPanelIdForType;
