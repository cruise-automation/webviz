// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { CommentingActions } from "webviz-core/src/actions/commenting";
import type { State } from "webviz-core/src/reducers";

export default function(state: State, action: CommentingActions): State {
  switch (action.type) {
    case "SET_FETCHED_COMMENTS_BASE":
      return {
        ...state,
        commenting: { ...state.commenting, fetchedCommentsBase: action.payload },
      };

    case "SET_FETCHED_COMMENTS_FEATURE":
      return {
        ...state,
        commenting: { ...state.commenting, fetchedCommentsFeature: action.payload },
      };

    case "SET_SOURCE_TO_SHOW":
      return { ...state, commenting: { ...state.commenting, sourceToShow: action.payload } };

    default:
      return { ...state, commenting: state.commenting };
  }
}
