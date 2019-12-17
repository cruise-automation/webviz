// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
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
  DatatypeExtraction: "DatatypeExtraction",
  InputTopicsChecker: "InputTopicsChecker",
  OutputTopicChecker: "OutputTopicChecker",
  Runtime: "Runtime",
};

export const ErrorCodes = {
  RUNTIME: 1,
  DatatypeExtraction: {
    NO_DEFAULT_EXPORT: 1,
    NON_FUNC_DEFAULT_EXPORT: 2,
    NO_TYPE_RETURN: 3,
    BAD_TYPE_RETURN: 4,
    UNKNOWN_ERROR: 5,
    NO_UNIONS: 6,
    NO_FUNCTIONS: 7,
    NO_CLASSES: 8,
    NO_TYPE_LITERALS: 9,
    NO_TUPLES: 10,
    NO_INTERSECTION_TYPES: 11,
    NO_TYPEOF: 11,
    PREFER_ARRAY_LITERALS: 13,
    STRICT_MARKERS_RETURN_TYPE: 14,
    NO_IMPORTS_IN_RETURN_TYPE: 15,
    LIMITED_UNIONS: 16,
  },
  InputTopicsChecker: {
    NO_INPUTS: 1,
    TOPIC_UNAVAILABLE: 2,
    CIRCULAR_IMPORT: 3,
  },
  OutputTopicChecker: {
    NO_OUTPUTS: 1,
    BAD_PREFIX: 2,
    NOT_UNIQUE: 3,
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
  code: number,
|};

export type NodeData = {|
  name: string,
  sourceCode: string,
  transpiledCode: string,
  diagnostics: $ReadOnlyArray<Diagnostic>,
  inputTopics: $ReadOnlyArray<string>,
  outputTopic: string,
  outputDatatype: string,
  datatypes: RosDatatypes,
  // Should be ts.Program. Not strongly typing here since we want to keep
  // Typescript out of the main bundle.
  program: ?any,
|};

export type PlayerInfo = $ReadOnly<{|
  topics: Topic[],
  datatypes: RosDatatypes,
|}>;

export type NodeDataTransformer = (
  nodeData: NodeData,
  playerStateActiveData: ?PlayerInfo,
  priorRegistrations: $ReadOnlyArray<Topic>
) => NodeData;

export type UserNodeLog = {
  source: "registerNode" | "processMessage",
  value: any, // TODO: This should ideally share the type def of `log()` in `lib.js`
};

export type UserNodeDiagnostics = { [nodeId: string]: { diagnostics: Diagnostic[] } };
export type UserNodeLogs = { [nodeId: string]: { logs: UserNodeLog[] } };

export type RegistrationOutput = {
  error: null | string,
  userNodeLogs: UserNodeLog[],
  userNodeDiagnostics: Diagnostic[],
};

export type ProcessMessageOutput = {
  message: ?{},
  error: null | string,
  userNodeLogs: UserNodeLog[],
  userNodeDiagnostics: Diagnostic[],
};
