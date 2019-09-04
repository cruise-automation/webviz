// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import type { ActionTypes } from "webviz-core/src/actions";
import type { Diagnostic } from "webviz-core/src/players/UserNodePlayer/types";

export type NodeDiagnostics = {
  [nodeName: string]: { diagnostics: Diagnostic[] },
};

export default function nodeDiagnostics(state: NodeDiagnostics = {}, action: ActionTypes) {
  switch (action.type) {
    case "SET_NODE_DIAGNOSTICS": {
      const nodeStates = { ...state, ...action.payload };

      Object.keys(action.payload).forEach((key) => {
        if (nodeStates[key] === undefined) {
          delete nodeStates[key];
        }
      });

      return nodeStates;
    }

    default:
      return state;
  }
}
