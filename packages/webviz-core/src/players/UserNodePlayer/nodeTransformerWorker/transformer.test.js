// @flow
//
//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import {
  getInputTopics,
  getOutputTopic,
  validateOutputTopic,
  validateInputTopics,
  compile,
  transpile,
} from "webviz-core/src/players/UserNodePlayer/nodeTransformerWorker/transformer";
import { DiagnosticSeverity, ErrorCodes } from "webviz-core/src/players/UserNodePlayer/types";
import { DEFAULT_WEBVIZ_NODE_PREFIX } from "webviz-core/src/util/globalConstants";

const baseNodeData = {
  name: "main",
  sourceCode: "",
  transpiledCode: "",
  diagnostics: [],
  inputTopics: [],
  outputTopic: "",
};

describe("pipeline", () => {
  describe("getInputTopics", () => {
    it.each([
      ["export const inputs = [ '/some_topic' ];", ["/some_topic"]],
      ["   export  const inputs = [ '/some_topic' ];", ["/some_topic"]],
      ["export const inputs = ['/some_topic'];", ["/some_topic"]],
      ["export const inputs = ['/some_topic'              ];", ["/some_topic"]],
      [`export const inputs = [ "/some_topic" ];`, ["/some_topic"]],
      [
        `export const otherVar = 'hi Jp';
        export const inputs = [ '/my_topic' ];`,
        ["/my_topic"],
      ],
    ])("should get each input topic", (sourceCode, expectedTopics) => {
      expect(getInputTopics({ ...baseNodeData, sourceCode }).inputTopics).toEqual(expectedTopics);
    });
    it.each([
      ["const inputs = '/some_topic'", ErrorCodes.InputTopicsChecker.NO_INPUTS],
      ["console.log('no inputs here')", ErrorCodes.InputTopicsChecker.NO_INPUTS],
      ["", ErrorCodes.InputTopicsChecker.NO_INPUTS],
    ])("returns errors for badly formatted inputs", (sourceCode, errorCategory) => {
      const { diagnostics } = getInputTopics({ ...baseNodeData, sourceCode });
      expect(diagnostics.length).toEqual(1);
      expect(diagnostics[0].severity).toEqual(DiagnosticSeverity.Error);
      expect(diagnostics[0].code).toEqual(errorCategory);
    });
  });
  describe("getOutputTopics", () => {
    it.each([
      ["export const output = '/my_topic'", "/my_topic"],
      ["   export  const output = '/my_topic'", "/my_topic"],
      [`export const output = "/my_topic"`, "/my_topic"],
    ])("retrieves the output topic", (sourceCode, expectedTopic) => {
      expect(getOutputTopic({ ...baseNodeData, sourceCode }).outputTopic).toEqual(expectedTopic);
    });
    it.each(["const output = ['/my_topic']", "const output = 42", ErrorCodes.OutputTopicChecker.NO_OUTPUTS])(
      "returns errors for badly formatted output topics",
      (sourceCode) => {
        const { diagnostics } = getOutputTopic({ ...baseNodeData, sourceCode });
        expect(diagnostics.length).toEqual(1);
        expect(diagnostics[0].severity).toEqual(DiagnosticSeverity.Error);
        expect(diagnostics[0].code).toEqual(ErrorCodes.OutputTopicChecker.NO_OUTPUTS);
      }
    );
  });
  describe("validateOutputTopic", () => {
    it.each([
      {
        outputTopic: `${DEFAULT_WEBVIZ_NODE_PREFIX}my_topic`,
        priorRegistrations: [
          {
            output: { name: `${DEFAULT_WEBVIZ_NODE_PREFIX}my_topic`, datatype: "std_msgs/Header" },
            inputs: [],
            processMessage: Promise.resolve(null),
            terminate: () => {},
          },
        ],
      },
    ])("errs duplicate declarations", ({ outputTopic, priorRegistrations }) => {
      const { diagnostics } = validateOutputTopic({ ...baseNodeData, outputTopic }, undefined, priorRegistrations);
      expect(diagnostics.length).toEqual(1);
      expect(diagnostics[0].severity).toEqual(DiagnosticSeverity.Error);
      expect(diagnostics[0].code).toEqual(ErrorCodes.OutputTopicChecker.NOT_UNIQUE);
    });
    it.each(["/bad_prefix"])("errs on bad topic prefixes", (outputTopic) => {
      const { diagnostics } = validateOutputTopic({ ...baseNodeData, outputTopic }, undefined, []);
      expect(diagnostics.length).toEqual(1);
      expect(diagnostics[0].severity).toEqual(DiagnosticSeverity.Error);
      expect(diagnostics[0].code).toEqual(ErrorCodes.OutputTopicChecker.BAD_PREFIX);
    });
  });
  describe("validateInputTopics", () => {
    it.each([[["/foo"], ["/bar"]], [["/foo"], ["/bar", "/baz"]]])(
      "returns a  error when an input topic is not yet available",
      (inputTopics, topics) => {
        const { diagnostics } = validateInputTopics(
          { ...baseNodeData, inputTopics },
          { topics: topics.map((name) => ({ name, datatype: "" })), datatypes: {} }
        );
        expect(diagnostics.length).toEqual(1);
        expect(diagnostics[0].severity).toEqual(DiagnosticSeverity.Error);
        expect(diagnostics[0].code).toEqual(ErrorCodes.InputTopicsChecker.TOPIC_UNAVAILABLE);
      }
    );
    it("errs when a node tries to input another user node", () => {
      const { diagnostics } = validateInputTopics(
        { ...baseNodeData, inputTopics: [`${DEFAULT_WEBVIZ_NODE_PREFIX}my_topic`] },
        undefined
      );
      expect(diagnostics.length).toEqual(1);
      expect(diagnostics[0].severity).toEqual(DiagnosticSeverity.Error);
      expect(diagnostics[0].code).toEqual(ErrorCodes.InputTopicsChecker.CIRCULAR_IMPORT);
    });
  });

  describe("compile", () => {
    it.each(["const x: string = 'hello webviz'", "const num: number = 1222"])("can compile", (sourceCode) => {
      const { diagnostics } = compile({ ...baseNodeData, sourceCode });
      expect(diagnostics.length).toEqual(0);
    });
    it.each([
      { sourceCode: "const x: string = 42;", errorCode: 2322 },
      { sourceCode: "export const x: number = 'hello webviz';", errorCode: 2322 },
      { sourceCode: "import { x } from './y'", errorCode: 2307 },
      { sourceCode: "const x: string = [];", errorCode: 2322 },
    ])("catches semantic errors", ({ sourceCode, errorCode }) => {
      const { diagnostics } = compile({ ...baseNodeData, sourceCode });
      expect(diagnostics.length).toEqual(1);
      const { source, message, severity, code } = diagnostics[0];
      expect(code).toEqual(errorCode);
      expect(source).toEqual("Typescript");
      expect(typeof message).toEqual("string");
      expect(severity).toEqual(DiagnosticSeverity.Error);
    });
    it.each([{ sourceCode: "const x = ';", errorCode: 1002 }, { sourceCode: "(", errorCode: 1109 }])(
      "catches syntactic errors",
      ({ sourceCode, errorCode }) => {
        const { diagnostics } = compile({ ...baseNodeData, sourceCode });
        expect(diagnostics.length).toEqual(1);
        const { source, message, severity, code } = diagnostics[0];
        expect(code).toEqual(errorCode);
        expect(source).toEqual("Typescript");
        expect(typeof message).toEqual("string");
        expect(severity).toEqual(DiagnosticSeverity.Error);
      }
    );
  });

  describe("transpile", () => {
    it.each(["const x: string = 'hello webviz'"])("can transpile", (sourceCode) => {
      const { transpiledCode, diagnostics } = transpile({ ...baseNodeData, sourceCode });
      expect(typeof transpiledCode).toEqual("string");
      expect(diagnostics.length).toEqual(0);
    });
  });
});
