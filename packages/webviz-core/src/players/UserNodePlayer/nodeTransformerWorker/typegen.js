// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import type { Topic } from "webviz-core/src/players/types";
import type { RosDatatypes, RosDatatype } from "webviz-core/src/types/RosDatatypes";
import UniqueLabelGenerator from "webviz-core/src/util/incrementingLabels";

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

export function formatInterfaceName(type: string): string {
  return type.replace(/\//g, "__");
}

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

class TypeNameGenerator {
  _labelGenerator: UniqueLabelGenerator = new UniqueLabelGenerator([], "UNDERSCORE");
  _existingLabels: Map<string, string> = new Map();

  getTypeName(datatypeId: string, datatypeName: string): string {
    const maybeExistingLabel = this._existingLabels.get(datatypeId);
    if (maybeExistingLabel) {
      return maybeExistingLabel;
    }
    const prettyName = formatInterfaceName(datatypeName);
    const uniquePrettyName = this._labelGenerator.suggestLabel(prettyName);
    this._labelGenerator.addLabel(uniquePrettyName);
    this._existingLabels.set(datatypeId, uniquePrettyName);
    return uniquePrettyName;
  }
}

// Creates a 1-1 mapping of ROS datatypes to Typescript interface declarations.
export const generateTypeDefs = (
  datatypes: RosDatatypes,
  typeNameGenerator: TypeNameGenerator = new TypeNameGenerator()
): InterfaceDeclarations => {
  const interfaceDeclarations: InterfaceDeclarations = {};
  const datatypeEntries = ((Object.entries(datatypes): any): Array<[string, RosDatatype]>);

  for (const [datatypeId, definition] of datatypeEntries) {
    if (interfaceDeclarations[datatypeId]) {
      continue;
    }

    const typeMembers = definition.fields
      .map(({ name, type, isArray, isConstant }) => {
        let node;
        if (isConstant) {
          // TODO: Support ROS constants at some point.
          return null;
        } else if (type === "json") {
          node = ts.createTypeReferenceNode(jsonInterfaceDeclaration.name);
        } else if (isArray && typedArrayMap[type] != null) {
          node = ts.createTypeReferenceNode(typedArrayMap[type]);
        } else if (rosPrimitivesToTypeScriptMap[type]) {
          node = ts.createKeywordTypeNode(rosPrimitivesToTypeScriptMap[type]);
        } else if (rosSpecialTypesToTypescriptMap[type]) {
          node = ts.createTypeReferenceNode(rosSpecialTypesToTypescriptMap[type].name);
        } else {
          const childTypeName = datatypes[type].name;
          node = ts.createTypeReferenceNode(typeNameGenerator.getTypeName(type, childTypeName));
        }
        if (isArray && !(type in typedArrayMap)) {
          node = ts.createArrayTypeNode(node);
        }

        return createProperty(name, node);
      })
      .filter((val) => !!val);

    interfaceDeclarations[datatypeId] = ts.createInterfaceDeclaration(
      undefined /* decorators */,
      [ts.createModifier(ts.SyntaxKind.ExportKeyword)] /* modifiers */,
      typeNameGenerator.getTypeName(datatypeId, definition.name) /* name */,
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

  const datatypeNameGenerator = new TypeNameGenerator();
  let datatypeInterfaces = generateTypeDefs(datatypes, datatypeNameGenerator);

  topics.forEach(({ name, datatypeId, datatypeName }) => {
    if (!datatypeInterfaces[datatypeId]) {
      datatypeInterfaces = {
        ...datatypeInterfaces,
        ...generateTypeDefs({ [datatypeId]: { name: datatypeName, fields: [] } }),
      };
    }

    const prettyName = datatypeNameGenerator.getTypeName(datatypeId, datatypeName);
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
          ts.createTypeReferenceNode(`${DATATYPES_IDENTIFIER}.${prettyName}`)
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
 * This type contains message definitions in the input with convenient names,
 * so that you can refer to the type "std_msgs/RGBA" as "std_msgs__RGBA"
 * wherever you like. These names may be ambiguous if the input contains
 * types with the same name but different definitions.
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
