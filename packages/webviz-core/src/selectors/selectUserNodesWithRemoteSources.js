// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { createSelector } from "reselect";

import type { State } from "webviz-core/src/reducers/index";
import type { UserNode, UserNodes } from "webviz-core/src/types/panels";
import type { PublishedPlaygroundNode } from "webviz-core/src/types/PublishedPlaygroundNodesApi";

// The userNodes stored in the layout will only contain sourceCode for local, unpublished nodes.
// This selected adds sourceCode for published nodess using publishedNodesByTopic.
export const selectUserNodesWithRemoteSources = createSelector<State, *, *, *, *>(
  (state): UserNodes => state.persistedState.panels.userNodes,
  (state): { [string]: PublishedPlaygroundNode } => state.userNodes.publishedNodesByTopic,
  (userNodes, publishedNodesByTopic): UserNodes => {
    const userNodesWithSourcePairs = Object.keys(userNodes)
      .map(
        (key): ?[string, UserNode] => {
          const node = userNodes[key];
          const sourceCode =
            node.published && publishedNodesByTopic ? publishedNodesByTopic[node.name]?.sourceCode : node.sourceCode;
          return sourceCode ? [key, { ...node, sourceCode }] : null;
        }
      )
      .filter(Boolean);

    return Object.fromEntries<string, UserNode>(userNodesWithSourcePairs);
  }
);
