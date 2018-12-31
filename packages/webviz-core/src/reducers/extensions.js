// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { ExtensionAction } from "webviz-core/src/actions/extensions";

export type Extensions = {
  markerProviders: Object[],
};
const initialState: Extensions = Object.freeze({
  markerProviders: [],
});

export default function(state: Extensions = initialState, action: ExtensionAction): Extensions {
  switch (action.type) {
    case "REGISTER_MARKER_PROVIDER":
      if (state.markerProviders.indexOf(action.payload) !== -1) {
        console.warn("attempted to register duplicate MarkerProvider", action.payload);
        return state;
      }
      return { markerProviders: [...state.markerProviders, action.payload] };

    case "UNREGISTER_MARKER_PROVIDER":
      return { markerProviders: state.markerProviders.filter((p) => p !== action.payload) };

    default:
      return state;
  }
}
