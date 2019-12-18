// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";

import useGlobalVariables, { type GlobalVariables } from "webviz-core/src/hooks/useGlobalVariables";

type GlobalVariablesActions = {|
  setGlobalVariables: (GlobalVariables) => void,
  overwriteGlobalVariables: (GlobalVariables) => void,
|};

type Props = {|
  children: (GlobalVariables, GlobalVariablesActions) => React.Node,
|};

export default function GlobalVariablesAccessor(props: Props) {
  const { globalVariables, setGlobalVariables, overwriteGlobalVariables } = useGlobalVariables();
  return props.children(globalVariables, {
    setGlobalVariables,
    overwriteGlobalVariables,
  });
}
