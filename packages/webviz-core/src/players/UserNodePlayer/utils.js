// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { DiagnosticSeverity, type NodeData } from "webviz-core/src/players/UserNodePlayer/types";

export const hasTransformerErrors = (nodeData: NodeData): boolean =>
  nodeData.diagnostics.some(({ severity }) => severity === DiagnosticSeverity.Error);
