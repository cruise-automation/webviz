// @flow
//
//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { NodeRegistration } from ".";
import type { Topic } from "webviz-core/src/players/types";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";
import { DEFAULT_WEBVIZ_NODE_PREFIX } from "webviz-core/src/util/globalConstants";

// These severity codes come directory from the monaco-editor, which when added
// to the editor object, will highlight information inline (given that we also
// provide line and column numbers).
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

export const ErrorCategories = {
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

export type Diagnostic = {|
  severity: $Values<typeof DiagnosticSeverity>,
  message: string,
  source: $Values<typeof Sources>,
  startLineNumber?: number,
  startColumn?: number,
  endLineNumber?: number,
  endColumn?: number,
  category: $Values<typeof ErrorCategories.InputTopicsChecker> | $Values<typeof ErrorCategories.OutputTopicChecker>,
|};

export type NodeData = {|
  name: string,
  sourceCode: string,
  transpiledCode: string,
  diagnostics: $ReadOnlyArray<Diagnostic>,
  inputTopics: $ReadOnlyArray<string>,
  outputTopic: string,
|};

type PlayerInfo = $ReadOnly<{|
  topics: Topic[],
  datatypes: RosDatatypes,
|}>;

type NodeDataTransformer = (
  nodeData: NodeData,
  playerStateActiveData: ?PlayerInfo,
  priorRegistrations: $ReadOnlyArray<NodeRegistration>
) => NodeData;

export const getInputTopics = (nodeData: NodeData): NodeData => {
  const inputTopics: $ReadOnlyArray<string> = Array.from(
    // $FlowFixMe - does not like matchAll
    nodeData.sourceCode.matchAll(/^\s*const\s+inputs\s*=\s*\[\s*("([^"]+)"|'([^']+)')\s*\]/gm),
    (match) => {
      // Pick either the first matching group or the second, which corresponds
      // to single quotes or double quotes respectively.
      return match[2] || match[3];
    }
  );

  if (!inputTopics.length) {
    const error: Diagnostic = {
      severity: DiagnosticSeverity.Error,
      message: 'Must include non-empty inputs array, e.g. "const inputs = ["/some_input_topic"];',
      source: Sources.InputTopicsChecker,
      category: ErrorCategories.InputTopicsChecker.NO_INPUTS,
    };

    return {
      ...nodeData,
      diagnostics: [...nodeData.diagnostics, error],
    };
  }

  return {
    ...nodeData,
    inputTopics,
  };
};

export const getOutputTopic = (nodeData: NodeData): NodeData => {
  const matches = /^\s*const\s+output\s*=\s*("([^"]+)"|'([^']+)')/gm.exec(nodeData.sourceCode);
  // Pick either the first matching group or the second, which corresponds
  // to single quotes or double quotes respectively.
  const outputTopic = matches && (matches[2] || matches[3]);

  if (!outputTopic) {
    const error = {
      severity: DiagnosticSeverity.Error,
      message: `Must include an output, e.g. const output = "${DEFAULT_WEBVIZ_NODE_PREFIX}your_output_topic";`,
      source: Sources.OutputTopicChecker,
      category: ErrorCategories.OutputTopicChecker.NO_OUTPUTS,
    };

    return {
      ...nodeData,
      diagnostics: [...nodeData.diagnostics, error],
    };
  }

  return {
    ...nodeData,
    outputTopic,
  };
};

export const validateInputTopics = (nodeData: NodeData, playerStateActiveData: ?PlayerInfo): NodeData => {
  const badInputTopic = nodeData.inputTopics.find((topic) => topic.startsWith(DEFAULT_WEBVIZ_NODE_PREFIX));
  if (badInputTopic) {
    const error = {
      severity: DiagnosticSeverity.Error,
      message: `Input "${badInputTopic}" cannot equal another node's output.`,
      source: "InputTopicsChecker",
      category: ErrorCategories.InputTopicsChecker.CIRCULAR_IMPORT,
    };

    return {
      ...nodeData,
      diagnostics: [...nodeData.diagnostics, error],
    };
  }

  const { inputTopics } = nodeData;
  const activeTopics = ((playerStateActiveData && playerStateActiveData.topics) || []).map(({ name }) => name);
  const diagnostics = [];
  for (const inputTopic of inputTopics) {
    if (!activeTopics.includes(inputTopic)) {
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        message: `Input "${inputTopic}" is not yet available`,
        source: Sources.InputTopicsChecker,
        category: ErrorCategories.InputTopicsChecker.TOPIC_UNAVAILABLE,
      });
    }
  }

  return {
    ...nodeData,
    diagnostics: [...nodeData.diagnostics, ...diagnostics],
  };
};

export const validateOutputTopic = (
  nodeData: NodeData,
  playerStateActiveData: ?PlayerInfo,
  priorRegistrations: $ReadOnlyArray<NodeRegistration>
): NodeData => {
  const { outputTopic } = nodeData;

  if (!outputTopic.startsWith(DEFAULT_WEBVIZ_NODE_PREFIX)) {
    return {
      ...nodeData,
      diagnostics: [
        ...nodeData.diagnostics,
        {
          severity: DiagnosticSeverity.Error,
          message: `Output "${outputTopic}" must start with "${DEFAULT_WEBVIZ_NODE_PREFIX}"`,
          source: Sources.OutputTopicChecker,
          category: ErrorCategories.OutputTopicChecker.BAD_PREFIX,
        },
      ],
    };
  }

  if (priorRegistrations.some(({ output }) => output.name === outputTopic)) {
    return {
      ...nodeData,
      diagnostics: [
        ...nodeData.diagnostics,
        {
          severity: DiagnosticSeverity.Error,
          message: `Output "${outputTopic}" must be unique`,
          source: Sources.OutputTopicChecker,
          category: ErrorCategories.OutputTopicChecker.NOT_UNIQUE,
        },
      ],
    };
  }

  return nodeData;
};

/*
TODO:
  - what happens when the `register` portion of the node pipeline fails to instantiate the code? can we get the stack trace?
*/
export const compose = (...transformers: NodeDataTransformer[]): NodeDataTransformer => {
  return (nodeData: NodeData, playerState: ?PlayerInfo, priorRegistrations: $ReadOnlyArray<NodeRegistration>) => {
    let newNodeData = nodeData;
    // TODO: try/catch here?
    for (const transformer of transformers) {
      newNodeData = transformer(newNodeData, playerState, priorRegistrations);
    }
    return newNodeData;
  };
};

/*

  TRANSFORM

  Defines the pipeline with which user nodes are processed. Each
  'NodeDataTransformer' is a pure function that receives NodeData and returns
  NodeData. In this way, each transformer has the power to inspect previous
  diagnostics, compiled source code, etc. and to abort the pipeline if there
  is a fatal error, or continue to pass along information further downstream
  when errors are not fatal.

*/
const transform = (
  name: string,
  sourceCode: string,
  playerInfo: ?PlayerInfo,
  priorRegistrations: $ReadOnlyArray<NodeRegistration>
): NodeData => {
  const transformer = compose(
    getInputTopics,
    getOutputTopic,
    validateInputTopics,
    validateOutputTopic
  );

  return transformer(
    {
      name,
      sourceCode,
      transpiledCode: "",
      inputTopics: [],
      outputTopic: "",
      diagnostics: [],
    },
    playerInfo,
    priorRegistrations
  );
};

export default transform;
