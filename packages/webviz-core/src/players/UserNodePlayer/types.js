// @flow
//
//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import type { Topic, Message } from "webviz-core/src/players/types";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";

export const DiagnosticSeverity = {
  Hint: 1,
  Info: 2,
  Warning: 4,
  Error: 8,
};

export const Sources = {
  Typescript: "Typescript",
  InputTopicsChecker: "InputTopicsChecker",
  OutputTopicChecker: "OutputTopicChecker",
};

export const ErrorCodes = {
  InputTopicsChecker: {
    NO_INPUTS: "NO_INPUTS",
    TOPIC_UNAVAILABLE: "TOPIC_UNAVAILABLE",
    CIRCULAR_IMPORT: "CIRCULAR_IMPORT",
  },
  OutputTopicChecker: {
    NO_OUTPUTS: "NO_OUTPUTS",
    BAD_PREFIX: "BAD_PREFIX",
    NOT_UNIQUE: "NOT_UNIQUE",
  },
};

export type NodeRegistration = {|
  inputs: $ReadOnlyArray<string>,
  output: Topic,
  processMessage: (Message) => Promise<?Message>,
  terminate: () => void,
|};

export type Diagnostic = {|
  severity: $Values<typeof DiagnosticSeverity>,
  message: string,
  source: $Values<typeof Sources>,
  startLineNumber?: number,
  startColumn?: number,
  endLineNumber?: number,
  endColumn?: number,
  code: $Values<typeof ErrorCodes.InputTopicsChecker> | $Values<typeof ErrorCodes.OutputTopicChecker>,
|};

export type NodeData = {|
  name: string,
  sourceCode: string,
  transpiledCode: string,
  diagnostics: $ReadOnlyArray<Diagnostic>,
  inputTopics: $ReadOnlyArray<string>,
  outputTopic: string,
|};

export type PlayerInfo = $ReadOnly<{|
  topics: Topic[],
  datatypes: RosDatatypes,
|}>;

export type NodeDataTransformer = (
  nodeData: NodeData,
  playerStateActiveData: ?PlayerInfo,
  priorRegistrations: $ReadOnlyArray<NodeRegistration>
) => NodeData;
