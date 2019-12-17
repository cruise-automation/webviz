// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { Topic } from "webviz-core/src/players/types";
import {
  constructDatatypes,
  findReturnType,
  findDefaultExportFunction,
  DatatypeExtractionError,
} from "webviz-core/src/players/UserNodePlayer/nodeTransformerWorker/typescript/ast";
import { lib_es6_dts, lib_filename } from "webviz-core/src/players/UserNodePlayer/nodeTransformerWorker/typescript/lib";
import {
  ros_lib_dts,
  ros_lib_filename,
} from "webviz-core/src/players/UserNodePlayer/nodeTransformerWorker/typescript/ros";
import {
  baseCompilerOptions,
  transformDiagnosticToMarkerData,
} from "webviz-core/src/players/UserNodePlayer/nodeTransformerWorker/utils";
import {
  DiagnosticSeverity,
  Sources,
  ErrorCodes,
  type NodeData,
  type Diagnostic,
  type PlayerInfo,
  type NodeDataTransformer,
} from "webviz-core/src/players/UserNodePlayer/types";
import { DEFAULT_WEBVIZ_NODE_PREFIX } from "webviz-core/src/util/globalConstants";
import reportError from "webviz-core/src/util/reportError";

// Typescript is required since the `import` syntax breaks VSCode, presumably
// because VSCode has Typescript built in and our import is conflicting with
// some model of theirs. We could just manually insert the entire TS
// source code.
const ts = require("typescript/lib/typescript");

export const getInputTopics = (nodeData: NodeData): NodeData => {
  const inputTopicDeclaration = nodeData.sourceCode.match(/^\s*export\s+const\s+inputs\s*=\s*\[[^\]]*\]/gm);
  const inputTopics: $ReadOnlyArray<string> = Array.from(
    // $FlowFixMe - does not like matchAll
    (inputTopicDeclaration ? inputTopicDeclaration[0] : "").matchAll(/("([^"]+)"|'([^']+)')/g),
    (match) => {
      // Pick either the first matching group or the second, which corresponds
      // to single quotes or double quotes respectively.
      return match[2] || match[3];
    }
  );

  if (!inputTopics.length) {
    const error: Diagnostic = {
      severity: DiagnosticSeverity.Error,
      message: 'Must include non-empty inputs array, e.g. export const inputs = ["/some_input_topic"];',
      source: Sources.InputTopicsChecker,
      code: ErrorCodes.InputTopicsChecker.NO_INPUTS,
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
  const matches = /^\s*export\s+const\s+output\s*=\s*("([^"]+)"|'([^']+)')/gm.exec(nodeData.sourceCode);
  // Pick either the first matching group or the second, which corresponds
  // to single quotes or double quotes respectively.
  const outputTopic = matches && (matches[2] || matches[3]);

  if (!outputTopic) {
    const error = {
      severity: DiagnosticSeverity.Error,
      message: `Must include an output, e.g. export const output = "${DEFAULT_WEBVIZ_NODE_PREFIX}your_output_topic";`,
      source: Sources.OutputTopicChecker,
      code: ErrorCodes.OutputTopicChecker.NO_OUTPUTS,
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

export const validateInputTopics = (nodeData: NodeData, playerStateActiveData: ?$ReadOnly<PlayerInfo>): NodeData => {
  const badInputTopic = nodeData.inputTopics.find((topic) => topic.startsWith(DEFAULT_WEBVIZ_NODE_PREFIX));
  if (badInputTopic) {
    const error = {
      severity: DiagnosticSeverity.Error,
      message: `Input "${badInputTopic}" cannot equal another node's output.`,
      source: "InputTopicsChecker",
      code: ErrorCodes.InputTopicsChecker.CIRCULAR_IMPORT,
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
        code: ErrorCodes.InputTopicsChecker.TOPIC_UNAVAILABLE,
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
  playerStateActiveData: ?$ReadOnly<PlayerInfo>,
  priorRegisteredTopics: $ReadOnlyArray<Topic>
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
          code: ErrorCodes.OutputTopicChecker.BAD_PREFIX,
        },
      ],
    };
  }

  if (priorRegisteredTopics.some((topic) => topic.name === outputTopic)) {
    return {
      ...nodeData,
      diagnostics: [
        ...nodeData.diagnostics,
        {
          severity: DiagnosticSeverity.Error,
          message: `Output "${outputTopic}" must be unique`,
          source: Sources.OutputTopicChecker,
          code: ErrorCodes.OutputTopicChecker.NOT_UNIQUE,
        },
      ],
    };
  }

  return nodeData;
};

// The transpile step is concerned purely with generating javascript we will
// actually run in the browser.
export const transpile = (nodeData: NodeData): NodeData => {
  // TODO: Better pipeline for a SourceFile input to transpileModule:
  // https://github.com/Microsoft/TypeScript/issues/28365
  const { outputText, diagnostics } = ts.transpileModule(nodeData.sourceCode, {
    reportDiagnostics: true,
    compilerOptions: baseCompilerOptions,
  });

  return {
    ...nodeData,
    transpiledCode: outputText,
    diagnostics: [...nodeData.diagnostics, ...diagnostics.map(transformDiagnosticToMarkerData)],
  };
};

// The compile step is currently used for generating syntactic/semantic errors. In the future, it
// will be leveraged to:
// - Generate the AST
// - Handle external libraries
// - (Hopefully) emit transpiled code
export const compile = (nodeData: NodeData): NodeData => {
  const { sourceCode } = nodeData;

  const options: ts.CompilerOptions = baseCompilerOptions;
  const nodeFileName = `${nodeData.name}.ts`;

  // The compiler host is basically the file system API Typescript is funneled
  // through. All we do is tell Typescript where it can locate files and how to
  // create source files for the time being.

  // Reference:
  // Using the compiler api: https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API
  // CompilerHost: https://github.com/microsoft/TypeScript/blob/v3.5.3/lib/typescript.d.ts#L2752
  // Architectual Overview: https://github.com/Microsoft/TypeScript/wiki/Architectural-Overview#overview-of-the-compilation-process

  const host: ts.CompilerHost = {
    getDefaultLibFileName: () => lib_filename,
    getCurrentDirectory: () => "",
    getCanonicalFileName: (fileName) => fileName,
    useCaseSensitiveFileNames: () => false,
    // TODO: path to ros lib differs for client vs. jest test
    fileExists: (fileName) => fileName === nodeFileName || fileName.endsWith(`node_modules/${ros_lib_filename}`),
    writeFile: () => {
      throw new Error(
        "The compiler host `writeFile` was called, which does not have any handlers written for it. Please write one now that you have hit it!"
      );
    },
    getNewLine: () => {
      throw new Error(
        "The compiler host `getNewLine` was called, which does not have any handlers written for it. Please write one now that you have hit it!"
      );
    },
    getSourceFile: (fileName) => {
      let code = "";

      if (fileName === nodeFileName) {
        code = sourceCode;
      } else if (fileName === lib_filename) {
        code = lib_es6_dts;
        // TODO: path to ros lib differs for client vs. jest test
      } else if (fileName.endsWith(`node_modules/${ros_lib_filename}`)) {
        code = ros_lib_dts;
      }

      return ts.createSourceFile(fileName, code, baseCompilerOptions.target, true);
    },
  };

  const program = ts.createProgram([nodeFileName], options, host);
  const diagnostics = [...program.getSemanticDiagnostics(), ...program.getSyntacticDiagnostics()];

  const newDiagnostics = diagnostics.map(transformDiagnosticToMarkerData);

  return {
    ...nodeData,
    program,
    diagnostics: [...nodeData.diagnostics, ...newDiagnostics],
  };
};

export const extractDatatypes = (nodeData: NodeData): NodeData => {
  const { program, name } = nodeData;
  if (!program) {
    throw new Error("No TypeScript 'program'. There is a problem with the `compile` step.");
  }

  // Do not attempt to run if there were any compile time errors.
  if (nodeData.diagnostics.find(({ source }) => source === Sources.Typescript)) {
    return nodeData;
  }

  const nodeFileName = `${name}.ts`;

  const source: ts.SourceFile = program.getSourceFile(nodeFileName);
  const checker = program.getTypeChecker();

  try {
    const exportNode = findDefaultExportFunction(source, checker);
    const typeNode = findReturnType(checker, 0, exportNode);
    const { outputDatatype, datatypes } = constructDatatypes(checker, typeNode, name);
    return { ...nodeData, datatypes, outputDatatype };
  } catch (error) {
    if (error instanceof DatatypeExtractionError) {
      return { ...nodeData, diagnostics: [...nodeData.diagnostics, error.diagnostic] };
    }
    // If we've hit this case, then we should fix it.
    reportError("Unknown error encountered in Node Playground. Please report to the webviz team.", error, "app");
    return {
      ...nodeData,
      diagnostics: [
        ...nodeData.diagnostics,
        {
          severity: DiagnosticSeverity.Error,
          message: "Unknown error encountered. This is likely a problem with Node Playground itself.",
          source: Sources.DatatypeExtraction,
          code: ErrorCodes.DatatypeExtraction.UNKNOWN_ERROR,
        },
      ],
    };
  }
};

/*
TODO:
  - what happens when the `register` portion of the node pipeline fails to instantiate the code? can we get the stack trace?
*/
export const compose = (...transformers: NodeDataTransformer[]): NodeDataTransformer => {
  return (nodeData: NodeData, playerState: ?$ReadOnly<PlayerInfo>, priorRegisteredTopics: $ReadOnlyArray<Topic>) => {
    let newNodeData = nodeData;
    // TODO: try/catch here?
    for (const transformer of transformers) {
      newNodeData = transformer(newNodeData, playerState, priorRegisteredTopics);
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
const transform = ({
  name,
  sourceCode,
  playerInfo,
  priorRegisteredTopics,
}: {
  name: string,
  sourceCode: string,
  playerInfo: ?$ReadOnly<PlayerInfo>,
  priorRegisteredTopics: $ReadOnlyArray<Topic>,
}): NodeData & { program: ?void } => {
  const transformer = compose(
    getInputTopics,
    getOutputTopic,
    validateInputTopics,
    validateOutputTopic,
    transpile,
    compile,
    extractDatatypes
  );

  const result = transformer(
    {
      name,
      sourceCode,
      transpiledCode: "",
      inputTopics: [],
      outputTopic: "",
      outputDatatype: "",
      diagnostics: [],
      datatypes: {},
      program: undefined,
    },
    playerInfo,
    priorRegisteredTopics
  );
  return { ...result, program: null };
};

export default transform;
