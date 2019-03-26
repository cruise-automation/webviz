// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

type REGISTER_MARKER_PROVIDER = {
  type: "REGISTER_MARKER_PROVIDER",
  payload: Object,
};

export const registerMarkerProvider = (payload: Object): REGISTER_MARKER_PROVIDER => ({
  type: "REGISTER_MARKER_PROVIDER",
  payload,
});

type UNREGISTER_MARKER_PROVIDER = {
  type: "UNREGISTER_MARKER_PROVIDER",
  payload: Object,
};

export const unregisterMarkerProvider = (payload: Object): UNREGISTER_MARKER_PROVIDER => ({
  type: "UNREGISTER_MARKER_PROVIDER",
  payload,
});

type SET_AUXILIARY_DATA = {
  type: "SET_AUXILIARY_DATA",
  payload: (Object) => Object,
};

export const setAuxiliaryData = (payload: (Object) => Object): SET_AUXILIARY_DATA => ({
  type: "SET_AUXILIARY_DATA",
  payload,
});

export type ExtensionsActions = REGISTER_MARKER_PROVIDER | UNREGISTER_MARKER_PROVIDER | SET_AUXILIARY_DATA;
