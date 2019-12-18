// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { useSelector, useDispatch } from "react-redux";
import { bindActionCreators } from "redux";

import { setGlobalVariables, overwriteGlobalVariables } from "webviz-core/src/actions/panels";

export type GlobalVariables = { [string]: any };

export default function useGlobalVariables(): {|
  globalVariables: GlobalVariables,
  setGlobalVariables: (GlobalVariables) => void,
  overwriteGlobalVariables: (GlobalVariables) => void,
|} {
  const globalVariables = useSelector((state) => state.panels.globalVariables);
  const dispatch = useDispatch();
  return {
    globalVariables,
    ...bindActionCreators({ setGlobalVariables, overwriteGlobalVariables }, dispatch),
  };
}
