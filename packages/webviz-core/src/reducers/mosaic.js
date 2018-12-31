// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { ActionTypes } from "webviz-core/src/actions";

type MosaicState = {
  mosaicId: string,
};

const initialState: MosaicState = {
  mosaicId: "",
};

export default function mosaicReducer(state: MosaicState = initialState, action: ActionTypes) {
  if (action.type === "SET_MOSAIC_ID") {
    const mosaicId = action.payload;
    return {
      ...state,
      mosaicId,
    };
  }
  return state;
}
