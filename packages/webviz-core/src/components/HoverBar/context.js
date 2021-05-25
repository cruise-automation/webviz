// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { isEqual } from "lodash";
import React, { type Node, useCallback, useState } from "react";

import type { HoverValue } from "webviz-core/src/types/hoverValue";
import { createSelectableContext, useContextSelector } from "webviz-core/src/util/hooks";

type HoverValueContext = $ReadOnly<{|
  value: ?HoverValue,
  setHoverValue: (HoverValue) => void,
  clearHoverValue: (string) => void,
|}>;

const Context = createSelectableContext<HoverValueContext>();

export function useClearHoverValue() {
  return useContextSelector(Context, useCallback((ctx) => ctx.clearHoverValue, []));
}

export function useSetHoverValue() {
  return useContextSelector(Context, useCallback((ctx) => ctx.setHoverValue, []));
}

export function useHoverValue(args: ?{ componentId: string, isTimestampScale: boolean }) {
  const hasArgs = !!args;
  const componentId = args?.componentId;
  const isTimestampScale = args?.isTimestampScale;
  return useContextSelector(
    Context,
    useCallback((ctx) => {
      if (!hasArgs) {
        // Raw form -- user needs to check that the value should be shown.
        return ctx.value;
      }
      if (ctx.value == null) {
        return null;
      }
      if (ctx.value.type === "PLAYBACK_SECONDS" && isTimestampScale) {
        // Always show playback-time hover values for timestamp-based charts.
        return ctx.value;
      }
      // Otherwise just show hover bars when hovering over the panel itself.
      return ctx.value.componentId === componentId ? ctx.value : null;
    }, [hasArgs, componentId, isTimestampScale])
  );
}

export function HoverValueProvider({ children }: { children: Node }) {
  const [value, rawSetHoverValue] = useState<?HoverValue>();
  const setHoverValue = useCallback(
    (newValue: HoverValue) => rawSetHoverValue((oldValue) => (isEqual(newValue, oldValue) ? oldValue : newValue)),
    [rawSetHoverValue]
  );
  const clearHoverValue = useCallback((componentId) => {
    rawSetHoverValue((currentValue) => (currentValue?.componentId === componentId ? null : currentValue));
  }, [rawSetHoverValue]);
  return <Context.Provider value={{ value, setHoverValue, clearHoverValue }}>{children}</Context.Provider>;
}
