// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// layerIndexes are used to specify the order which markers are drawn
export const LAYER_INDEX_TEXT = 10;
export const LAYER_INDEX_OCCUPANCY_GRIDS = -1;

// When the World is drawn in multiple passes, these values are used
// to set the base for all markers in that render pass.
export const LAYER_INDEX_DEFAULT_BASE = 0;
export const LAYER_INDEX_HIGHLIGHT_OVERLAY = 500;
export const LAYER_INDEX_HIGHLIGHT_BASE = 1000;
export const LAYER_INDEX_DIFF_MODE_BASE_PER_PASS = 100;
