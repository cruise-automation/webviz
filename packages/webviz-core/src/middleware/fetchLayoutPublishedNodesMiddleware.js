// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { fetchPublishedNodes } from "webviz-core/src/actions/userNodes";
import { getExperimentalFeature } from "webviz-core/src/components/ExperimentalFeatures";
import type { Store } from "webviz-core/src/reducers";

type Action = { type: string, payload: any };

// Automatically fetches the sourceCode for any remote userNode referenced by the layout
const fetchLayoutPublishedNodesMiddleware = (store: Store) => (next: (Action) => any) => (action: Action) => {
  const userNodes = store.getState().persistedState?.panels?.userNodes;
  const result = next(action); // eslint-disable-line callback-return

  const nextState = store.getState();
  const userNodesAfterAction = nextState.persistedState?.panels?.userNodes;

  // If the userNodes changed after the action, fetch any uncached published nodes.
  const nodePlaygroundSourceControl = getExperimentalFeature("nodePlaygroundSourceControl");
  if (nodePlaygroundSourceControl && userNodes !== userNodesAfterAction) {
    const { publishedNodesByTopic } = nextState.userNodes;
    const nodes = Object.keys(userNodesAfterAction).map((nodeId) => userNodesAfterAction[nodeId]);
    const uncachedPublishedNodeTopics = nodes
      .filter((node) => node.published && !publishedNodesByTopic[node.name])
      .map(({ name }) => name);

    store.dispatch(fetchPublishedNodes(uncachedPublishedNodeTopics));
  }

  return result;
};

export default fetchLayoutPublishedNodesMiddleware;
