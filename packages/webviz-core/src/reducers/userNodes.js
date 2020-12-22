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
};

export default function userNodes(state: State, action: ActionTypes): State {
  switch (action.type) {
    case "SET_USER_NODE_DIAGNOSTICS": {
      const userNodeDiagnostics = { ...state.userNodes.userNodeDiagnostics };
      Object.keys(action.payload.diagnostics).forEach((nodeId) => {
        const payloadDiagnostics = action.payload.diagnostics[nodeId].diagnostics;
        if (action.payload.diagnostics[nodeId] === undefined) {
          delete userNodeDiagnostics[nodeId];
        } else if (!userNodeDiagnostics[nodeId]) {
          userNodeDiagnostics[nodeId] = { diagnostics: payloadDiagnostics, logs: [] };
        } else {
          userNodeDiagnostics[nodeId] = { ...userNodeDiagnostics[nodeId], diagnostics: payloadDiagnostics };
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

    default:
      return { ...state, userNodes: state.userNodes };
  }
}
