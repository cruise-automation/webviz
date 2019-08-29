// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { NodeDiagnostics } from "webviz-core/src/reducers/nodeDiagnostics";

type SET_NODE_DIAGNOSTICS = {
  type: "SET_NODE_DIAGNOSTICS",
  payload: NodeDiagnostics,
};

export const setNodeDiagnostics = (payload: NodeDiagnostics) => ({
  type: "SET_NODE_DIAGNOSTICS",
  payload,
});

export type SetNodeDiagnostics = typeof setNodeDiagnostics;

export type NodeDiagnosticsActions = SET_NODE_DIAGNOSTICS;
