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
  DiagnosticSeverity,
  validateOutputTopic,
  validateInputTopics,
  ErrorCategories,
} from "./transformer";
import { DEFAULT_WEBVIZ_NODE_PREFIX } from "webviz-core/src/util/globalConstants";

const baseNodeData = {
  name: "",
  sourceCode: "",
  transpiledCode: "",
  diagnostics: [],
  inputTopics: [],
  outputTopic: "",
};

describe("pipeline", () => {
  describe("getInputTopics", () => {
    it.each([
      ["const inputs = [ '/some_topic' ];", ["/some_topic"]],
      ["   const inputs = [ '/some_topic' ];", ["/some_topic"]],
      ["const inputs = ['/some_topic'];", ["/some_topic"]],
      ["const inputs = ['/some_topic'              ];", ["/some_topic"]],
      [`const inputs = [ "/some_topic" ];`, ["/some_topic"]],
      [
        `const otherVar = 'hi Jp';
        const inputs = [ '/my_topic' ];`,
        ["/my_topic"],
      ],
    ])("should get each input topic", (sourceCode, expectedTopics) => {
      expect(getInputTopics({ ...baseNodeData, sourceCode }).inputTopics).toEqual(expectedTopics);
    });
    it.each([
      ["const inputs = '/some_topic'", ErrorCategories.InputTopicsChecker.NO_INPUTS],
      ["console.log('no inputs here')", ErrorCategories.InputTopicsChecker.NO_INPUTS],
      ["", ErrorCategories.InputTopicsChecker.NO_INPUTS],
    ])("returns errors for badly formatted inputs", (sourceCode, errorCategory) => {
      const { diagnostics } = getInputTopics({ ...baseNodeData, sourceCode });
      expect(diagnostics.length).toEqual(1);
      expect(diagnostics[0].severity).toEqual(DiagnosticSeverity.Error);
      expect(diagnostics[0].category).toEqual(errorCategory);
    });
  });
  describe("getOutputTopics", () => {
    it.each([
      ["const output = '/my_topic'", "/my_topic"],
      ["   const output = '/my_topic'", "/my_topic"],
      [`const output = "/my_topic"`, "/my_topic"],
    ])("retrieves the output topic", (sourceCode, expectedTopic) => {
      expect(getOutputTopic({ ...baseNodeData, sourceCode }).outputTopic).toEqual(expectedTopic);
    });
    it.each(["const output = ['/my_topic']", "const output = 42", ErrorCategories.OutputTopicChecker.NO_OUTPUTS])(
      "returns errors for badly formatted output topics",
      (sourceCode) => {
        const { diagnostics } = getOutputTopic({ ...baseNodeData, sourceCode });
        expect(diagnostics.length).toEqual(1);
        expect(diagnostics[0].severity).toEqual(DiagnosticSeverity.Error);
        expect(diagnostics[0].category).toEqual(ErrorCategories.OutputTopicChecker.NO_OUTPUTS);
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
      expect(diagnostics[0].category).toEqual(ErrorCategories.OutputTopicChecker.NOT_UNIQUE);
    });
    it.each(["/bad_prefix"])("errs on bad topic prefixes", (outputTopic) => {
      const { diagnostics } = validateOutputTopic({ ...baseNodeData, outputTopic }, undefined, []);
      expect(diagnostics.length).toEqual(1);
      expect(diagnostics[0].severity).toEqual(DiagnosticSeverity.Error);
      expect(diagnostics[0].category).toEqual(ErrorCategories.OutputTopicChecker.BAD_PREFIX);
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
        expect(diagnostics[0].category).toEqual(ErrorCategories.InputTopicsChecker.TOPIC_UNAVAILABLE);
      }
    );
    it("errs when a node tries to input another user node", () => {
      const { diagnostics } = validateInputTopics(
        { ...baseNodeData, inputTopics: [`${DEFAULT_WEBVIZ_NODE_PREFIX}my_topic`] },
        undefined
      );
      expect(diagnostics.length).toEqual(1);
      expect(diagnostics[0].severity).toEqual(DiagnosticSeverity.Error);
      expect(diagnostics[0].category).toEqual(ErrorCategories.InputTopicsChecker.CIRCULAR_IMPORT);
    });
  });
});
