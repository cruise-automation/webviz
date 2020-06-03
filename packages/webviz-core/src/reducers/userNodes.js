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
  diagnostics: Diagnostic[],
  logs: UserNodeLog[],
  trusted: boolean, // Security flag that indicates whether we should populate a dialogue box.
};

export default function userNodes(state: State, action: ActionTypes): State {
  const newUserNodesState = { ...state.userNodes };

  switch (action.type) {
    case "SET_USER_NODE_DIAGNOSTICS": {
      const userNodeDiagnostics = { ...newUserNodesState.userNodeDiagnostics };
      Object.keys(action.payload).forEach((nodeId) => {
        const payloadDiagnostics = action.payload[nodeId].diagnostics;
        if (action.payload[nodeId] === undefined) {
          delete userNodeDiagnostics[nodeId];
        } else if (!userNodeDiagnostics[nodeId]) {
          userNodeDiagnostics[nodeId] = { diagnostics: payloadDiagnostics, logs: [] };
        } else {
          userNodeDiagnostics[nodeId] = { ...userNodeDiagnostics[nodeId], diagnostics: payloadDiagnostics };
        }
      });
      return { ...state, userNodes: { ...newUserNodesState, userNodeDiagnostics } };
    }

    case "ADD_USER_NODE_LOGS": {
      const userNodeDiagnostics = { ...newUserNodesState.userNodeDiagnostics };
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
      return { ...state, userNodes: { ...newUserNodesState, userNodeDiagnostics } };
    }

    case "CLEAR_USER_NODE_LOGS": {
      const userNodeDiagnostics = { ...newUserNodesState.userNodeDiagnostics };
      const nodeId = action.payload;
      if (userNodeDiagnostics[nodeId]) {
        userNodeDiagnostics[nodeId] = { ...userNodeDiagnostics[nodeId], logs: [] };
      }
      return { ...state, userNodes: { ...newUserNodesState, userNodeDiagnostics } };
    }

    case "SET_USER_NODE_TRUST": {
      const userNodeDiagnostics = { ...newUserNodesState.userNodeDiagnostics };
      const { id, trusted } = action.payload;
      userNodeDiagnostics[id] = { logs: [], diagnostics: [], ...userNodeDiagnostics[id], trusted };
      return { ...state, userNodes: { ...newUserNodesState, userNodeDiagnostics } };
    }

    case "SET_USER_NODE_ROS_LIB": {
      return { ...state, userNodes: { ...newUserNodesState, rosLib: action.payload } };
    }

    default:
      return { ...state, userNodes: newUserNodesState };
  }
}
