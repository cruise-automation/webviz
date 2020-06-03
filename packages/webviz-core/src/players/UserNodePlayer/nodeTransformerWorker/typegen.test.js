// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// Pulled from our open source demo bag: https://open-source-webviz-ui.s3.amazonaws.com/demo.bag
import stressTestDatatypes from "webviz-core/src/players/UserNodePlayer/nodeTransformerWorker/fixtures/example-datatypes.json";
import { compile } from "webviz-core/src/players/UserNodePlayer/nodeTransformerWorker/transformer";
import generateRosLib, {
  generateTypeDefs,
  typedArrayMap,
  type InterfaceDeclarations,
} from "webviz-core/src/players/UserNodePlayer/nodeTransformerWorker/typegen";
import type { NodeData } from "webviz-core/src/players/UserNodePlayer/types";

const ts = require("typescript/lib/typescript");

const baseNodeData: NodeData = {
  name: "/webviz_node/main",
  sourceCode: "",
  transpiledCode: "",
  diagnostics: [],
  inputTopics: [],
  outputTopic: "",
  outputDatatype: "",
  datatypes: {},
  sourceFile: undefined,
  typeChecker: undefined,
  rosLib: "",
  projectCode: new Map<string, string>(),
};

// For stringifying Typescript declarations. Makes it much easier to write tests against the output.
const formatTypeDef = (interfaceDeclarations: InterfaceDeclarations): { [datatype: string]: string } => {
  const resultFile = ts.createSourceFile(
    "testFile.ts",
    "",
    ts.ScriptTarget.Latest,
    /*setParentNodes*/ false,
    ts.ScriptKind.TS
  );
  const printer = ts.createPrinter();
  const datatypes = {};
  Object.entries(interfaceDeclarations).forEach(([datatype, interfaceDeclaration]) => {
    datatypes[datatype] = printer
      .printNode(ts.EmitHint.Unspecified, interfaceDeclaration, resultFile)
      .replace(/\n/g, " ")
      .replace(/\s+/g, " ");
  });

  return datatypes;
};

describe("typegen", () => {
  describe("generateTypeDefs", () => {
    describe("basic types", () => {
      it("multiple properties", () => {
        const declarations = generateTypeDefs({
          "std_msgs/ColorRGBA": {
            fields: [
              { type: "float32", name: "r", isArray: false, isComplex: false },
              { type: "float32", name: "g", isArray: false, isComplex: false },
              { type: "float32", name: "b", isArray: false, isComplex: false },
              { type: "float32", name: "a", isArray: false, isComplex: false },
            ],
          },
        });
        expect(formatTypeDef(declarations)).toEqual({
          "std_msgs/ColorRGBA": `export interface std_msgs__ColorRGBA { r: number; g: number; b: number; a: number; }`,
        });
      });
    });
    describe("special ros types", () => {
      it("time", () => {
        const declarations = generateTypeDefs({
          "std_msgs/Time": {
            fields: [{ type: "time", name: "t", isArray: false, isComplex: false }],
          },
        });
        expect(formatTypeDef(declarations)).toEqual({
          "std_msgs/Time": `export interface std_msgs__Time { t: Time; }`,
        });
      });
      it("duration", () => {
        const declarations = generateTypeDefs({
          "std_msgs/Duration": {
            fields: [{ type: "duration", name: "t", isArray: false, isComplex: false }],
          },
        });
        expect(formatTypeDef(declarations)).toEqual({
          "std_msgs/Duration": `export interface std_msgs__Duration { t: Duration; }`,
        });
      });
    });
    describe("internal references", () => {
      it("allows ros datatypes that refer to each other", () => {
        const declarations = generateTypeDefs({
          "geometry_msgs/Pose": {
            fields: [{ type: "geometry_msgs/Point", name: "position", isArray: false, isComplex: true }],
          },
          "geometry_msgs/Point": {
            fields: [
              { type: "float64", name: "x", isArray: false, isComplex: false },
              { type: "float64", name: "y", isArray: false, isComplex: false },
              { type: "float64", name: "z", isArray: false, isComplex: false },
            ],
          },
        });
        expect(formatTypeDef(declarations)).toEqual({
          "geometry_msgs/Pose": `export interface geometry_msgs__Pose { position: geometry_msgs__Point; }`,
          "geometry_msgs/Point": `export interface geometry_msgs__Point { x: number; y: number; z: number; }`,
        });
      });
      it("does not add duplicate declarations for interfaces already created", () => {
        const declarations = generateTypeDefs({
          "geometry_msgs/Pose": {
            fields: [
              { type: "geometry_msgs/Point", name: "position", isArray: false, isComplex: true },
              { type: "geometry_msgs/Point", name: "last_position", isArray: false, isComplex: true },
            ],
          },
          "geometry_msgs/Point": {
            fields: [
              { type: "float64", name: "x", isArray: false, isComplex: false },
              { type: "float64", name: "y", isArray: false, isComplex: false },
              { type: "float64", name: "z", isArray: false, isComplex: false },
            ],
          },
        });
        expect(formatTypeDef(declarations)).toEqual({
          "geometry_msgs/Pose": `export interface geometry_msgs__Pose { position: geometry_msgs__Point; last_position: geometry_msgs__Point; }`,
          "geometry_msgs/Point": `export interface geometry_msgs__Point { x: number; y: number; z: number; }`,
        });
      });
      it("allows deep internal references", () => {
        const declarations = generateTypeDefs({
          "geometry_msgs/Pose": {
            fields: [{ type: "geometry_msgs/Directions", name: "directions", isArray: true, isComplex: true }],
          },
          "geometry_msgs/Directions": {
            fields: [{ type: "geometry_msgs/Point", name: "positions", isArray: true, isComplex: true }],
          },

          "geometry_msgs/Point": {
            fields: [
              { type: "float64", name: "x", isArray: false, isComplex: false },
              { type: "float64", name: "y", isArray: false, isComplex: false },
              { type: "float64", name: "z", isArray: false, isComplex: false },
            ],
          },
        });
        expect(formatTypeDef(declarations)).toEqual({
          "geometry_msgs/Pose": `export interface geometry_msgs__Pose { directions: geometry_msgs__Directions[]; }`,
          "geometry_msgs/Directions": `export interface geometry_msgs__Directions { positions: geometry_msgs__Point[]; }`,
          "geometry_msgs/Point": `export interface geometry_msgs__Point { x: number; y: number; z: number; }`,
        });
      });
    });

    describe("arrays", () => {
      it("defines primitive arrays", () => {
        const declarations = generateTypeDefs({
          "std_msgs/Points": {
            fields: [{ type: "string", name: "x", isArray: true, isComplex: false }],
          },
        });
        expect(formatTypeDef(declarations)).toEqual({
          "std_msgs/Points": `export interface std_msgs__Points { x: string[]; }`,
        });
      });
      it("typed arrays", () => {
        Object.entries(typedArrayMap).forEach(([rosType, jsType]) => {
          const declarations = generateTypeDefs({
            "std_msgs/Data": {
              fields: [{ type: rosType, name: "x", isArray: true, isComplex: false }],
            },
          });
          const formattedTypes = formatTypeDef(declarations);
          const type = ((jsType: any): string);
          expect(formattedTypes).toEqual({
            "std_msgs/Data": `export interface std_msgs__Data { x: ${type}; }`,
          });

          const { diagnostics } = compile({ ...baseNodeData, sourceCode: formattedTypes["std_msgs/Data"] });
          expect(diagnostics).toEqual([]);
        });
      });
      it("references", () => {
        const declarations = generateTypeDefs({
          "geometry_msgs/Pose": {
            fields: [{ type: "geometry_msgs/Point", name: "position", isArray: true, isComplex: true }],
          },
          "geometry_msgs/Point": {
            fields: [
              { type: "float64", name: "x", isArray: false, isComplex: false },
              { type: "float64", name: "y", isArray: false, isComplex: false },
              { type: "float64", name: "z", isArray: false, isComplex: false },
            ],
          },
        });
        expect(formatTypeDef(declarations)).toEqual({
          "geometry_msgs/Pose": `export interface geometry_msgs__Pose { position: geometry_msgs__Point[]; }`,
          "geometry_msgs/Point": `export interface geometry_msgs__Point { x: number; y: number; z: number; }`,
        });
      });
    });
    describe("ros constants", () => {
      it("does not return anything for ros constants", () => {
        const declarations = generateTypeDefs({
          "std_msgs/Constants": {
            fields: [{ type: "uint8", name: "ARROW", isConstant: true, value: 0 }],
          },
        });
        expect(formatTypeDef(declarations)).toEqual({
          "std_msgs/Constants": "export interface std_msgs__Constants { }",
        });
      });
    });
    describe("empty references", () => {
      it("contains an empty interface definition if the datatype does not have any properties", () => {
        const declarations = generateTypeDefs({
          "std_msgs/NoDef": {
            fields: [],
          },
        });
        expect(formatTypeDef(declarations)).toEqual({
          "std_msgs/NoDef": "export interface std_msgs__NoDef { }",
        });
      });
    });
  });

  describe("generateRosLib", () => {
    it("basic snapshot", () => {
      const rosLib = generateRosLib({
        topics: [
          {
            name: "/my_topic",
            datatype: "std_msgs/ColorRGBA",
          },
          { name: "/empty_topic", datatype: "std_msgs/NoDef" },
        ],
        datatypes: {
          "std_msgs/ColorRGBA": {
            fields: [
              { type: "float32", name: "r", isArray: false, isComplex: false },
              { type: "float32", name: "g", isArray: false, isComplex: false },
              { type: "float32", name: "b", isArray: false, isComplex: false },
              { type: "float32", name: "a", isArray: false, isComplex: false },
            ],
          },
        },
      });
      const { diagnostics } = compile({ ...baseNodeData, sourceCode: rosLib });
      expect(diagnostics).toEqual([]);

      expect(rosLib).toMatchSnapshot();
    });
    it("more complex snapshot", () => {
      const randomTopics = Object.keys(stressTestDatatypes).map((datatype, i) => ({
        name: `/topic_${i}`,
        datatype,
      }));
      const rosLib = generateRosLib({ topics: randomTopics, datatypes: stressTestDatatypes });
      const { diagnostics } = compile({ ...baseNodeData, sourceCode: rosLib });
      expect(diagnostics).toEqual([]);

      expect(rosLib).toMatchSnapshot();
    });
    it("works with zero topics or datatypes", () => {
      const rosLib = generateRosLib({ topics: [], datatypes: {} });
      expect(rosLib).toMatchSnapshot();
      const { diagnostics } = compile({ ...baseNodeData, sourceCode: rosLib });
      expect(diagnostics).toEqual([]);
    });
  });
});
