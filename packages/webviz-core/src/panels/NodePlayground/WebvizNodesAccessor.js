// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import microMemoize from "micro-memoize";
import * as React from "react";
import { connect } from "react-redux";

import { setWebvizNodes, overwriteWebvizNodes } from "webviz-core/src/actions/panels";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import { type NodeDefinition } from "webviz-core/src/pipeline/nodes";
import { type NodePayload } from "webviz-core/src/types/panels";

export type NodesActions = {|
  setWebvizNodes: (NodePayload) => void,
  overwriteWebvizNodes: (NodePayload) => void,
|};

type OwnProps = {|
  children: (Object, NodesActions) => React.Node,
|};
type Props = {
  ...OwnProps,
  webvizNodes: { [nodeName: string]: string },
  ...NodesActions,
};

function WebvizNodesAccessor(props: Props) {
  return props.children(props.webvizNodes, {
    setWebvizNodes: props.setWebvizNodes,
    overwriteWebvizNodes: props.overwriteWebvizNodes,
  });
}

const getDefaultNodesByOutput = microMemoize((nodeDefinitions: NodeDefinition<*>[]) => {
  const result = {};
  for (const nodeDefinition of nodeDefinitions) {
    result[nodeDefinition.output.name] = { text: JSON.stringify(nodeDefinition), readOnly: true };
  }
  return result;
});

const getUserNodesByOutput = (nodeDefinitions) => {
  const result = {};
  for (const output in nodeDefinitions) {
    result[output] = { text: nodeDefinitions[output], readOnly: false };
  }
  return result;
};

const mapStateToProps = (state, ownProps): any => {
  const { panels } = state;
  const { webvizNodes } = panels;

  return {
    webvizNodes: {
      ...getUserNodesByOutput(webvizNodes),
      ...getDefaultNodesByOutput(getGlobalHooks().nodes()),
    },
  };
};

export default connect<Props, OwnProps, _, _, _, _>(
  mapStateToProps,
  { setWebvizNodes, overwriteWebvizNodes }
)(WebvizNodesAccessor);
