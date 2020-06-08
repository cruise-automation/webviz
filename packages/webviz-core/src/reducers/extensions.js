// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { ExtensionsActions } from "webviz-core/src/actions/extensions";
import type { State } from "webviz-core/src/reducers";

export type Extensions = { markerProviders: any[], auxiliaryData: any };

export default function(state: State, action: ExtensionsActions): State {
  switch (action.type) {
    case "REGISTER_MARKER_PROVIDER":
      if (state.extensions.markerProviders.indexOf(action.payload) !== -1) {
        console.warn("attempted to register duplicate MarkerProvider", action.payload);
        return { ...state, extensions: state.extensions };
      }
      return {
        ...state,
        extensions: { ...state.extensions, markerProviders: [...state.extensions.markerProviders, action.payload] },
      };

    case "UNREGISTER_MARKER_PROVIDER":
      return {
        ...state,
        extensions: {
          ...state.extensions,
          markerProviders: state.extensions.markerProviders.filter((p) => p !== action.payload),
        },
      };

    case "SET_AUXILIARY_DATA":
      return {
        ...state,
        extensions: {
          ...state.extensions,
          auxiliaryData: { ...state.extensions.auxiliaryData, ...action.payload(state.extensions.auxiliaryData) },
        },
      };

    default:
      return { ...state, extensions: state.extensions };
  }
}
