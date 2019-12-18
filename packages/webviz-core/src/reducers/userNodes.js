// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import type { ActionTypes } from "webviz-core/src/actions";
import type { Diagnostic, UserNodeLog } from "webviz-core/src/players/UserNodePlayer/types";

export type UserNodeState = {
  diagnostics: Diagnostic[],
  logs: UserNodeLog[],
  trusted: boolean, // Security flag that indicates whether we should populate a dialogue box.
};

export type UserNodesState = {
  [guid: string]: UserNodeState,
};

export default function userNodes(state: UserNodesState = {}, action: ActionTypes) {
  switch (action.type) {
    case "SET_USER_NODE_DIAGNOSTICS": {
      const nodeStates = { ...state };
      Object.keys(action.payload).forEach((nodeId) => {
        const payloadDiagnostics = action.payload[nodeId].diagnostics;
        if (action.payload[nodeId] === undefined) {
          delete nodeStates[nodeId];
        } else if (!nodeStates[nodeId]) {
          nodeStates[nodeId] = { diagnostics: payloadDiagnostics, logs: [] };
        } else {
          nodeStates[nodeId] = { ...nodeStates[nodeId], diagnostics: payloadDiagnostics };
        }
      });
      return nodeStates;
    }

    case "ADD_USER_NODE_LOGS": {
      const nodeStates = { ...state };
      for (const nodeId of Object.keys(action.payload)) {
        const existingLogs = nodeStates[nodeId] && nodeStates[nodeId].logs;
        const payloadLogs = action.payload[nodeId].logs;
        if (action.payload[nodeId] === undefined) {
          delete nodeStates[nodeId];
        } else if (!nodeStates[nodeId]) {
          nodeStates[nodeId] = { diagnostics: [], logs: payloadLogs };
        } else {
          nodeStates[nodeId] = { ...nodeStates[nodeId], logs: existingLogs.concat(payloadLogs) };
        }
      }
      return nodeStates;
    }

    case "CLEAR_USER_NODE_LOGS": {
      const nodeStates = { ...state };
      const nodeId = action.payload;
      if (nodeStates[nodeId]) {
        nodeStates[nodeId] = { ...nodeStates[nodeId], logs: [] };
      }
      return nodeStates;
    }

    case "SET_USER_NODE_TRUST": {
      const nodeStates = { ...state };
      const { id, trusted } = action.payload;
      nodeStates[id] = { logs: [], diagnostics: [], ...nodeStates[id], trusted };
      return nodeStates;
    }

    default:
      return state;
  }
}
