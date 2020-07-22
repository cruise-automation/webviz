// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { HoverValue } from "webviz-core/src/types/hoverValue";

export type SET_HOVER_VALUE = {
  type: "SET_HOVER_VALUE",
  payload: {
    value: HoverValue,
    skipSettingLocalStorage: true,
  },
};

export type CLEAR_HOVER_VALUE = {
  type: "CLEAR_HOVER_VALUE",
  payload: {
    componentId: string,
    skipSettingLocalStorage: true,
  },
};

export const setHoverValue = (payload: HoverValue): SET_HOVER_VALUE => ({
  type: "SET_HOVER_VALUE",
  payload: { value: payload, skipSettingLocalStorage: true },
});

export const clearHoverValue = (payload: { componentId: string }): CLEAR_HOVER_VALUE => ({
  type: "CLEAR_HOVER_VALUE",
  payload: { ...payload, skipSettingLocalStorage: true },
});

export type HoverValueActions = SET_HOVER_VALUE | CLEAR_HOVER_VALUE;
