// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import type { Time } from "rosbag";

import { type GlobalVariables } from "webviz-core/src/hooks/useGlobalVariables";
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
  Other: "Other",
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
    NO_TYPEOF: 12,
    PREFER_ARRAY_LITERALS: 13,
    STRICT_MARKERS_RETURN_TYPE: 14,
    LIMITED_UNIONS: 15,
    NO_NESTED_ANY: 16,
    NO_MAPPED_TYPES: 17,
    NO_NESTED_ARRAYS: 18,
  },
  InputTopicsChecker: {
    NO_TOPIC_AVAIL: 1,
    CIRCULAR_IMPORT: 2,
    NO_INPUTS_EXPORT: 3,
    EMPTY_INPUTS_EXPORT: 4,
    BAD_INPUTS_TYPE: 5,
  },
  OutputTopicChecker: {
    NO_OUTPUTS: 1,
    BAD_PREFIX: 2,
    NOT_UNIQUE: 3,
  },
  Other: {
    FILENAME: 1,
  },
};

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
  projectCode: ?Map<string, string>,
  diagnostics: $ReadOnlyArray<Diagnostic>,
  inputTopics: $ReadOnlyArray<string>,
  outputTopic: string,
  outputDatatype: string,
  datatypes: RosDatatypes,
  // Should be ts.SourceFile and ts.TypeChecker. Not strongly typing here since we want to keep
  // Typescript out of the main bundle.
  sourceFile: ?any,
  typeChecker: ?any,
  rosLib: string,
  enableSecondSource: boolean,
  // An array of globalVariable names
  globalVariables: $ReadOnlyArray<string>,
|};

export type NodeRegistration = {|
  nodeId: string,
  nodeData: NodeData,
  inputs: $ReadOnlyArray<string>,
  output: Topic,
  processMessages: (Message[], RosDatatypes, GlobalVariables) => Promise<Message[]>,
  terminate: () => void,
|};

export type NodeDataTransformer = (nodeData: NodeData, topics: Topic[]) => NodeData;

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
  message: ?Message,
  error: null | string,
  userNodeLogs: UserNodeLog[],
};

export type ProcessMessagesOutput =
  | {
      error: null | string,
      userNodeLogs: UserNodeLog[],
      type: "parsed",
      messages: Message[],
    }
  | {
      error: null | string,
      userNodeLogs: UserNodeLog[],
      type: "binary",
      binaryData: {
        bigString: string,
        buffer: ArrayBuffer,
        serializedMessages: { offset: number, receiveTime: Time, topic: string }[],
      },
    };
