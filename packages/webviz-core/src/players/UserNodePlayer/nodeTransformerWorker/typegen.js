// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import type { Topic } from "webviz-core/src/players/types";
import type { RosDatatypes, RosDatatype } from "webviz-core/src/types/RosDatatypes";

const ts = require("typescript/lib/typescript");

export type InterfaceDeclarations = {
  [datatype: string]: ts.InterfaceDeclaration,
};

const modifiers = [ts.createModifier(ts.SyntaxKind.ExportKeyword), ts.createModifier(ts.SyntaxKind.DeclareKeyword)];

const createProperty = (name: string, type: ts.TypeNode) =>
  ts.createProperty(
    undefined /* decorators */,
    undefined /* modifiers */,
    name /* name */,
    undefined /* questionOrExclamationToken */,
    type /* type */
  );

const createTimeInterfaceDeclaration = (name: string) =>
  ts.createInterfaceDeclaration(
    undefined /* decorators */,
    modifiers /* modifiers */,
    name /* name */,
    undefined /* typeParameters */,
    undefined /* heritageClauses */,
    [
      createProperty("sec", ts.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword)),
      createProperty("nsec", ts.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword)),
    ] /* members */
  );

// Since rosbagjs treats json as a primitive, we have to shim it in.
// TODO: Update json declaration in a smarter way.
const jsonInterfaceDeclaration = ts.createInterfaceDeclaration(
  undefined /* decorators */,
  modifiers /* modifiers */,
  "json" /* name */,
  undefined /* typeParameters */,
  undefined /* heritageClauses */,
  [] /* members */
);

export const formatInterfaceName = (type: string) => type.replace(/\//g, "__");

// http://wiki.ros.org/msg
const rosPrimitivesToTypeScriptMap = {
  uint8: ts.SyntaxKind.NumberKeyword,
  int8: ts.SyntaxKind.NumberKeyword,
  uint16: ts.SyntaxKind.NumberKeyword,
  int16: ts.SyntaxKind.NumberKeyword,
  uint32: ts.SyntaxKind.NumberKeyword,
  int32: ts.SyntaxKind.NumberKeyword,
  float32: ts.SyntaxKind.NumberKeyword,
  float64: ts.SyntaxKind.NumberKeyword,
  int64: ts.SyntaxKind.NumberKeyword,
  uint64: ts.SyntaxKind.NumberKeyword,
  string: ts.SyntaxKind.StringKeyword,
  bool: ts.SyntaxKind.BooleanKeyword,
};

// NOTE: This list should stay in sync with rosbagjs. Exported for tests.
export const typedArrayMap = {
  uint8: "Uint8Array",
  int8: "Int8Array",
};

const rosSpecialTypesToTypescriptMap = {
  time: createTimeInterfaceDeclaration("Time"),
  duration: createTimeInterfaceDeclaration("Duration"),
};

// Creates a 1-1 mapping of ROS datatypes to Typescript interface declarations.
export const generateTypeDefs = (datatypes: RosDatatypes): InterfaceDeclarations => {
  const interfaceDeclarations: InterfaceDeclarations = {};
  const datatypeEntries = ((Object.entries(datatypes): any): Array<[string, RosDatatype]>);

  for (const [datatype, definition] of datatypeEntries) {
    if (interfaceDeclarations[datatype]) {
      continue;
    }

    const typeMembers = definition.fields
      .map(({ name, type, isArray, isConstant }) => {
        let node;
        if (isConstant) {
          // TODO: Support ROS constants at some point.
          return null;
        } else if (isArray && typedArrayMap[type]) {
          node = ts.createTypeReferenceNode(typedArrayMap[type]);
        } else if (rosPrimitivesToTypeScriptMap[type]) {
          node = ts.createKeywordTypeNode(rosPrimitivesToTypeScriptMap[type]);
        } else if (rosSpecialTypesToTypescriptMap[type]) {
          node = ts.createTypeReferenceNode(rosSpecialTypesToTypescriptMap[type].name);
        } else {
          node = ts.createTypeReferenceNode(formatInterfaceName(type));
        }
        if (isArray && !typedArrayMap[type]) {
          node = ts.createArrayTypeNode(node);
        }

        return createProperty(name, node);
      })
      .filter((val) => !!val);

    interfaceDeclarations[datatype] = ts.createInterfaceDeclaration(
      undefined /* decorators */,
      [ts.createModifier(ts.SyntaxKind.ExportKeyword)] /* modifiers */,
      formatInterfaceName(datatype) /* name */,
      undefined /* typeParameters */,
      undefined /* heritageClauses */,
      typeMembers /* members */
    );
  }

  return interfaceDeclarations;
};

// Creates the entire ros.d.ts declaration file.
const generateRosLib = ({ topics, datatypes }: { topics: Topic[], datatypes: RosDatatypes }): string => {
  let TopicsToMessageDefinition = ts.createInterfaceDeclaration(
    undefined,
    modifiers /* modifiers */,
    "TopicsToMessageDefinition"
  );

  const typedMessage = ts.createInterfaceDeclaration(
    undefined /* decorators */,
    modifiers /* modifiers */,
    "Input" /* name */,
    [
      ts.createTypeParameterDeclaration(
        "T",
        ts.createTypeOperatorNode(ts.SyntaxKind.KeyOfKeyword, TopicsToMessageDefinition.name)
      ),
    ] /* typeParameters */,
    undefined /* heritageClauses */,
    [
      createProperty("topic", ts.createTypeReferenceNode("T")),
      createProperty("receiveTime", ts.createTypeReferenceNode("Time")),
      createProperty("message", ts.createTypeReferenceNode("TopicsToMessageDefinition[T]")),
    ] /* members */
  );

  const DATATYPES_IDENTIFIER = "Messages";

  let datatypeInterfaces = generateTypeDefs(datatypes);

  topics.forEach(({ name, datatype }) => {
    if (!datatypeInterfaces[datatype]) {
      datatypeInterfaces = { ...datatypeInterfaces, ...generateTypeDefs({ [datatype]: { fields: [] } }) };
    }

    TopicsToMessageDefinition = ts.updateInterfaceDeclaration(
      TopicsToMessageDefinition /* node */,
      undefined /* decorators */,
      modifiers /* modifiers */,
      TopicsToMessageDefinition.name,
      undefined /* typeParameters */,
      undefined /* heritageClauses */,
      [
        ...TopicsToMessageDefinition.members,
        createProperty(
          ts.createStringLiteral(name),
          ts.createTypeReferenceNode(`${DATATYPES_IDENTIFIER}.${formatInterfaceName(datatype)}`)
        ),
      ] /* members */
    );
  });

  const datatypesNamespace = ts.createModuleDeclaration(
    undefined /* decorators */,
    modifiers /* modifiers */,
    ts.createIdentifier(DATATYPES_IDENTIFIER),
    ts.createModuleBlock(
      Object.values(datatypeInterfaces).map((val) => {
        return val;
      })
    ),
    ts.NodeFlags.Namespace
  );

  const sourceFile = ts.createSourceFile(
    "", // This argument doesn't really matter.
    "" /* sourceText */,
    ts.ScriptTarget.Latest,
    false /* setParentNodes */,
    ts.ScriptKind.TS /* scriptKind */
  );

  // The following formatting could be accomplished with `printer.printList`,
  // however adding inline comments this way was easier.
  const printer = ts.createPrinter();
  const result = `
    ${printer.printNode(ts.EmitHint.Unspecified, jsonInterfaceDeclaration, sourceFile)}
    ${printer.printNode(ts.EmitHint.Unspecified, TopicsToMessageDefinition, sourceFile)}
    ${printer.printNode(ts.EmitHint.Unspecified, rosSpecialTypesToTypescriptMap.duration, sourceFile)}
    ${printer.printNode(ts.EmitHint.Unspecified, rosSpecialTypesToTypescriptMap.time, sourceFile)}

    /**
     * This type contains every message declaration in your bag, so that you can
     * refer to the type "std_msgs/RGBA" as "std_msgs__RGBA" wherever you like.
     */
    ${printer.printNode(ts.EmitHint.Unspecified, datatypesNamespace, sourceFile)}

    /**
     * To correctly type your inputs, you use this type to refer to specific
     * input topics, e.g. 'Input<"/your_input_topic">'. If you have
     * multiple input topics, use a union type, e.g.
     * 'Input<"/your_input_topic_1"> |
     * Input<"/your_input_topic_2">'.
     *
     * These types are dynamically generated from the bag(s) currently in your
     * webviz session, so if a datatype changes, your Node Playground node may
     * not compile on the newly formatted bag.
     */
    ${printer.printNode(ts.EmitHint.Unspecified, typedMessage, sourceFile)}
  `;

  return result;
};

export default generateRosLib;
