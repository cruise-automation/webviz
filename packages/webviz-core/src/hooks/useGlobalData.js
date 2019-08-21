// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { useSelector, useDispatch } from "react-redux";
import { bindActionCreators } from "redux";

import { setGlobalData, overwriteGlobalData } from "webviz-core/src/actions/panels";

export type GlobalData = { [string]: any };

export default function useGlobalData(): {|
  globalData: GlobalData,
  setGlobalData: (GlobalData) => void,
  overwriteGlobalData: (GlobalData) => void,
|} {
  const globalData = useSelector((state) => state.panels.globalData);
  const dispatch = useDispatch();
  return {
    globalData,
    ...bindActionCreators({ setGlobalData, overwriteGlobalData }, dispatch),
  };
}
