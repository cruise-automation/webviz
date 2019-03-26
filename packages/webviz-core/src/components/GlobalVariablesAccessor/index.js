// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import * as React from "react";
import { connect } from "react-redux";

import { setGlobalData, overwriteGlobalData } from "webviz-core/src/actions/panels";

type GlobalVariablesActions = {|
  setGlobalData: (Object) => void,
  overwriteGlobalData: (Object) => void,
|};

type OwnProps = {|
  children: (Object, GlobalVariablesActions) => React.Node,
|};
type Props = {
  ...OwnProps,
  globalData: Object,
  ...GlobalVariablesActions,
};

function GlobalVariablesAccessor(props: Props) {
  return props.children(props.globalData, {
    setGlobalData: props.setGlobalData,
    overwriteGlobalData: props.overwriteGlobalData,
  });
}

const mapStateToProps = (state, ownProps): any => {
  const { panels } = state;
  const { globalData } = panels;

  return {
    globalData,
  };
};

export default connect<Props, OwnProps, _, _, _, _>(
  mapStateToProps,
  { setGlobalData, overwriteGlobalData }
)(GlobalVariablesAccessor);
