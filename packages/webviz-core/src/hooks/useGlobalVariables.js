// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { bindActionCreators } from "redux";

import { setGlobalVariables, overwriteGlobalVariables } from "webviz-core/src/actions/panels";

export type GlobalVariables = { [string]: any };

// Keep this in sync with the variable syntax in MessagePathSyntax's grammar.ne:
const GLOBAL_VARIABLE_REGEX = /\$\{([a-zA-Z0-9_]+)\}/g;

export default function useGlobalVariables(): {|
  globalVariables: GlobalVariables,
  setGlobalVariables: (GlobalVariables) => void,
  overwriteGlobalVariables: (GlobalVariables) => void,
|} {
  const globalVariables = useSelector((state) => state.persistedState.panels.globalVariables);
  const dispatch = useDispatch();
  const actionCreators = useMemo(() => bindActionCreators({ setGlobalVariables, overwriteGlobalVariables }, dispatch), [
    dispatch,
  ]);
  return { ...actionCreators, globalVariables };
}

// Replaces any text matching a ${global_variable} with the current variable value
export function useStringWithInlinedGlobalVariables(inputString: string) {
  const { globalVariables } = useGlobalVariables();
  const stringWithInlinedVariables = useMemo(
    () => inputString.replace(GLOBAL_VARIABLE_REGEX, (keyExpr, key) => globalVariables[key] || ""),
    [globalVariables, inputString]
  );
  return stringWithInlinedVariables;
}
