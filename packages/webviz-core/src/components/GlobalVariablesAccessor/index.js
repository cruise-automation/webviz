// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";

import useGlobalData, { type GlobalData } from "webviz-core/src/hooks/useGlobalData";

type GlobalDataActions = {|
  setGlobalData: (GlobalData) => void,
  overwriteGlobalData: (GlobalData) => void,
|};

type Props = {|
  children: (GlobalData, GlobalDataActions) => React.Node,
|};

export default function GlobalVariablesAccessor(props: Props) {
  const { globalData, setGlobalData, overwriteGlobalData } = useGlobalData();
  return props.children(globalData, {
    setGlobalData,
    overwriteGlobalData,
  });
}
