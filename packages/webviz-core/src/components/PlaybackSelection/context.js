// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { isEqual } from "lodash";
import React, { type Node, useCallback, useState } from "react";

import { createSelectableContext, useContextSelector } from "webviz-core/src/util/hooks";

// Specified as numeric percentages of the total duration from the start of playback.
// For example, the center of the playback bar is 0.5 = 50%.
export type SelectionRange = {| start: number, end: number |};

// Used to control a get/set a selectable range within the PlaybackBar.
// Currently only used by the recording code.
type SelectionRangeContext = $ReadOnly<{|
  value: ?SelectionRange,
  setSelectionRange: (SelectionRange) => void,
  clearSelectionRange: () => void,
|}>;

const Context = createSelectableContext<SelectionRangeContext>();

export function useClearSelectionRange() {
  return useContextSelector(Context, useCallback((ctx) => ctx.clearSelectionRange, []));
}

export function useSetSelectionRange() {
  return useContextSelector(Context, useCallback((ctx) => ctx.setSelectionRange, []));
}

export function useSelectionRange() {
  return useContextSelector(Context, useCallback((ctx) => ctx.value, []));
}

export function SelectionRangeProvider({ children, defaultValue }: { children: Node, defaultValue?: SelectionRange }) {
  const [value, rawSetSelectionRange] = useState<?SelectionRange>(defaultValue);
  const setSelectionRange = useCallback(
    (newValue: SelectionRange) =>
      rawSetSelectionRange((oldValue) => (isEqual(newValue, oldValue) ? oldValue : newValue)),
    [rawSetSelectionRange]
  );
  const clearSelectionRange = useCallback(() => {
    rawSetSelectionRange(null);
  }, [rawSetSelectionRange]);
  return <Context.Provider value={{ value, setSelectionRange, clearSelectionRange }}>{children}</Context.Provider>;
}
