// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import type { ActionTypes } from "webviz-core/src/actions";
import type { Diagnostic, UserNodeLog } from "webviz-core/src/players/UserNodePlayer/types";
import type { State } from "webviz-core/src/reducers";

export type UserNodeDiagnostics = {
  diagnostics?: Diagnostic[],
  logs: UserNodeLog[],
  metadata: {
    outputTopic: string,
    inputTopics: string[],
  },
};

export default function userNodes(state: State, action: ActionTypes): State {
  switch (action.type) {
    case "SET_COMPILED_USER_NODE_DATA": {
      const userNodeDiagnostics = { ...state.userNodes.userNodeDiagnostics };
      Object.keys(action.payload.compiledNodeData).forEach((nodeId) => {
        const compiledNodeData = action.payload.compiledNodeData[nodeId];
        if (action.payload.compiledNodeData[nodeId] === undefined) {
          delete userNodeDiagnostics[nodeId];
        } else if (!userNodeDiagnostics[nodeId]) {
          userNodeDiagnostics[nodeId] = { ...compiledNodeData, logs: [] };
        } else {
          userNodeDiagnostics[nodeId] = { ...userNodeDiagnostics[nodeId], ...compiledNodeData };
        }
      });
      return { ...state, userNodes: { ...state.userNodes, userNodeDiagnostics } };
    }

    case "ADD_USER_NODE_LOGS": {
      const userNodeDiagnostics = { ...state.userNodes.userNodeDiagnostics };
      for (const nodeId of Object.keys(action.payload)) {
        const existingLogs = userNodeDiagnostics[nodeId] && userNodeDiagnostics[nodeId].logs;
        const payloadLogs = action.payload[nodeId].logs;
        if (action.payload[nodeId] === undefined) {
          delete userNodeDiagnostics[nodeId];
        } else if (!userNodeDiagnostics[nodeId]) {
          userNodeDiagnostics[nodeId] = { diagnostics: [], logs: payloadLogs };
        } else {
          userNodeDiagnostics[nodeId] = { ...userNodeDiagnostics[nodeId], logs: existingLogs.concat(payloadLogs) };
        }
      }
      return { ...state, userNodes: { ...state.userNodes, userNodeDiagnostics } };
    }

    case "CLEAR_USER_NODE_LOGS": {
      const userNodeDiagnostics = { ...state.userNodes.userNodeDiagnostics };
      const nodeId = action.payload;
      if (userNodeDiagnostics[nodeId]) {
        userNodeDiagnostics[nodeId] = { ...userNodeDiagnostics[nodeId], logs: [] };
      }
      return { ...state, userNodes: { ...state.userNodes, userNodeDiagnostics } };
    }

    case "SET_USER_NODE_ROS_LIB": {
      return { ...state, userNodes: { ...state.userNodes, rosLib: action.payload } };
    }

    case "SET_PUBLISHED_NODES_LIST": {
      return { ...state, userNodes: { ...state.userNodes, publishedNodesList: action.payload } };
    }

    case "SET_PUBLISHED_NODES_BY_TOPIC": {
      return { ...state, userNodes: { ...state.userNodes, publishedNodesByTopic: action.payload } };
    }

    default:
      return { ...state, userNodes: state.userNodes };
  }
}
