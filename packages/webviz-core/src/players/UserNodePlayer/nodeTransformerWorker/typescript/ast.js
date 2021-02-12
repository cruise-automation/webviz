// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { without } from "lodash";
import { type RosMsgField } from "rosbag";

import baseDatatypes from "webviz-core/src/players/UserNodePlayer/nodeTransformerWorker/typescript/baseDatatypes";
import {
  noFuncError,
  nonFuncError,
  badTypeReturnError,
  unionsError,
  functionError,
  noTypeLiteralsError,
  noIntersectionTypesError,
  preferArrayLiteral,
  classError,
  noTypeOfError,
  noMappedTypes,
  noTuples,
  limitedUnionsError,
  noNestedAny,
} from "webviz-core/src/players/UserNodePlayer/nodeTransformerWorker/typescript/errors";
import { DiagnosticSeverity, Sources, ErrorCodes, type Diagnostic } from "webviz-core/src/players/UserNodePlayer/types";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";

// Typescript is required since the `import` syntax breaks VSCode, presumably
// because VSCode has Typescript built in and our import is conflicting with
// some model of theirs. We could just manually insert the entire TS
// source code.
const ts = require("typescript/lib/typescript");

type TypeParam = {
  parent: TypeParam,
  current: ts.TypeParameterDeclaration | ts.TypeNode,
};

type TypeMap = {
  [string | number]: TypeParam,
};

// Ensures our recursive AST traversals don't too far down.
const MAX_DEPTH = 100;

// This class of error is explicitly for users debugging within NodePlayground.
// In other words, it is the **known** set of errors. Since this error class requires
// diagnostic information, it will enable users to figure out where their code
// has broken according to our rules. It should **not** be used in code paths where we cannot
// provide any helpful debugging information to the user. In the event we come across an unknown
// error class, just throw a regular error. This error will be reported in the notification tab
// as a true error, so that users can inform us when things are truly broken.
export class DatatypeExtractionError extends Error {
  diagnostic: Diagnostic;
  constructor(diagnostic: Diagnostic) {
    super();
    this.diagnostic = diagnostic;
  }
}

export const findChild = (node: ts.Node, kind: ts.SyntaxKind[]): ?ts.Node =>
  ts.forEachChild(node, (child) => {
    if (kind.includes(child.kind)) {
      return child;
    }
  });

// Symbols can have multiple declarations associated with them. For instance,
// `const myType = 'my-type';` and `type myType = string` would map to the same
// symbol. In those instances, we should ideally search through the declarations
// on a symbol to explicitly find what we are looking for.
export const findDeclaration = (symbol: ts.Symbol, kind: ts.SyntaxKind[]): ?ts.Node => {
  for (const declaration of symbol.declarations) {
    if (kind.includes(declaration.kind)) {
      return declaration;
    }
  }
};

const findImportedTypeDeclaration = (checker: ts.TypeChecker, node: ts.Node, kind: ts.SyntaxKind[]): ?ts.Node => {
  const declaredType = checker.getDeclaredTypeOfSymbol(node.symbol);
  if (!declaredType) {
    throw new Error(`Could not find type import type`);
  }
  return findDeclaration(declaredType.symbol || declaredType.aliasSymbol, kind);
};

// These functions are used to build up mapping for generic types.
const buildTypeMapFromParams = (typeParameters: ts.TypeParameterDeclaration[] = [], typeMap: TypeMap): TypeMap => {
  const newTypeParamMap = {};
  for (let i = 0; i < typeParameters.length; i++) {
    const currentParam = typeParameters[i];
    newTypeParamMap[currentParam.name.escapedText] = {
      current: currentParam,
      parent: typeMap[i] || { parent: null, current: currentParam.default },
    };
  }
  return newTypeParamMap;
};

const buildTypeMapFromArgs = (typeArguments: ts.TypeNode[] = [], typeMap: TypeMap): TypeMap => {
  const newTypeParamMap = {};
  typeArguments.forEach((typeArg, i) => {
    const text = typeArg.getText();
    const parent = typeMap[text] || typeMap[i] || null;
    const current = typeArg;
    newTypeParamMap[i] = { current, parent };
  });
  return newTypeParamMap;
};

const isNodeFromRosModule = (node: ts.SyntaxKind.TypeLiteral | ts.SyntaxKind.InterfaceDeclaration): boolean => {
  return node.getSourceFile().fileName.endsWith("ros/index.d.ts");
};

export const findDefaultExportFunction = (source: ts.SourceFile, checker: ts.TypeChecker): ts.Node => {
  const defaultExportSymbol = checker.getExportsOfModule(source.symbol).find((node) => node.escapedName === "default");
  if (!defaultExportSymbol) {
    throw new DatatypeExtractionError(noFuncError);
  }

  const functionDeclarationNode = findDeclaration(defaultExportSymbol, [ts.SyntaxKind.FunctionDeclaration]);
  if (functionDeclarationNode) {
    return functionDeclarationNode;
  }

  const exportAssignmentNode = findDeclaration(defaultExportSymbol, [ts.SyntaxKind.ExportAssignment]);
  const exportedNode = findChild(exportAssignmentNode, [
    ts.SyntaxKind.FunctionDeclaration,
    ts.SyntaxKind.FunctionExpression,
    ts.SyntaxKind.ArrowFunction,
    ts.SyntaxKind.Identifier,
  ]);

  if (!exportedNode) {
    throw new DatatypeExtractionError(nonFuncError);
  }

  return exportedNode;
};

export const findReturnType = (
  checker: ts.TypeChecker,
  depth: number = 1,
  node: ts.Node
): ts.TypeLiteralNode | ts.InterfaceDeclaration => {
  if (depth > MAX_DEPTH) {
    throw new Error(`Max AST traversal depth exceeded ${MAX_DEPTH}.`);
  }

  if (!node) {
    throw new Error("Node is undefined.");
  }

  const visitNext = findReturnType.bind(null, checker, depth + 1);

  switch (node.kind) {
    case ts.SyntaxKind.TypeLiteral:
    case ts.SyntaxKind.InterfaceDeclaration:
      return node;
    case ts.SyntaxKind.ArrowFunction: {
      const nextNode = findChild(node, [
        ts.SyntaxKind.TypeReference,
        ts.SyntaxKind.TypeLiteral,
        ts.SyntaxKind.IntersectionType, // Unhandled type--let next recursive call handle error.
        ts.SyntaxKind.UnionType,
        ts.SyntaxKind.IndexedAccessType,
      ]);
      if (nextNode) {
        return visitNext(nextNode);
      }
      throw new DatatypeExtractionError(badTypeReturnError);
    }
    case ts.SyntaxKind.Identifier: {
      const symbol = checker.getSymbolAtLocation(node);
      if (!symbol.valueDeclaration) {
        throw new DatatypeExtractionError(nonFuncError);
      }
      return visitNext(symbol.valueDeclaration);
    }
    case ts.SyntaxKind.VariableDeclaration: {
      const nextNode = findChild(node, [ts.SyntaxKind.TypeReference, ts.SyntaxKind.ArrowFunction]);
      if (!nextNode) {
        throw new DatatypeExtractionError(nonFuncError);
      }
      return visitNext(nextNode);
    }
    case ts.SyntaxKind.TypeReference: {
      const symbol = checker.getSymbolAtLocation(node.typeName);
      const nextNode = findDeclaration(symbol, [
        ts.SyntaxKind.TypeAliasDeclaration,
        ts.SyntaxKind.InterfaceDeclaration,
        ts.SyntaxKind.ClassDeclaration,
        ts.SyntaxKind.ImportSpecifier,
      ]);
      return visitNext(nextNode);
    }
    case ts.SyntaxKind.FunctionDeclaration: {
      const nextNode = findChild(node, [ts.SyntaxKind.TypeReference, ts.SyntaxKind.TypeLiteral]);
      return visitNext(nextNode);
    }
    case ts.SyntaxKind.FunctionType: {
      return visitNext(node.type);
    }
    case ts.SyntaxKind.TypeAliasDeclaration: {
      return visitNext(node.type);
    }
    case ts.SyntaxKind.ImportSpecifier: {
      const declaration = findImportedTypeDeclaration(checker, node, [
        ts.SyntaxKind.TypeLiteral,
        ts.SyntaxKind.InterfaceDeclaration,
      ]);
      return visitNext(declaration);
    }

    case ts.SyntaxKind.IndexedAccessType: {
      const declaration = visitNext(node.objectType);
      const indexedProperty = node?.indexType?.literal?.text;

      const next = declaration.members.find((member) => member?.name?.text === indexedProperty);

      return visitNext(next.type);
    }

    case ts.SyntaxKind.TypeQuery:
      throw new DatatypeExtractionError(noTypeOfError);

    case ts.SyntaxKind.MappedType:
      throw new DatatypeExtractionError(noMappedTypes);

    case ts.SyntaxKind.AnyKeyword:
    case ts.SyntaxKind.LiteralType: {
      throw new DatatypeExtractionError(badTypeReturnError);
    }
    case ts.SyntaxKind.IntersectionType:
      throw new DatatypeExtractionError(noIntersectionTypesError);
    case ts.SyntaxKind.ClassDeclaration: {
      throw new DatatypeExtractionError(classError);
    }
    case ts.SyntaxKind.UnionType: {
      const remainingTypes = node.types.filter(({ kind }) => kind !== ts.SyntaxKind.UndefinedKeyword);
      if (remainingTypes.length !== 1) {
        throw new DatatypeExtractionError(limitedUnionsError);
      }
      return visitNext(remainingTypes[0]);
    }
    default:
      throw new Error("Unhandled node kind.");
  }
};

export const constructDatatypes = (
  checker: ts.TypeChecker,
  node: ts.SyntaxKind.TypeLiteral | ts.SyntaxKind.InterfaceDeclaration,
  currentDatatype: string,
  messageDefinitionMap: { [formattedDatatype: string]: string },
  depth: number = 1,
  currentTypeParamMap: TypeMap = {}
): { outputDatatype: string, datatypes: RosDatatypes } => {
  if (++depth > MAX_DEPTH) {
    throw new Error(`Max AST traversal depth exceeded.`);
  }

  // In the case that the user has specified a dynamically generated message
  // definition, we can check whether it exists in the 'ros' module and just
  // return the ros-specific definition, e.g. 'std_msgs/ColorRGBA', instead of
  // our own definition. This allows user nodes to operate much more freely.
  const interfaceName = node?.name?.text;
  if (isNodeFromRosModule(node) && messageDefinitionMap[interfaceName]) {
    return {
      outputDatatype: messageDefinitionMap[interfaceName],
      datatypes: baseDatatypes,
    };
  }

  // TODO: Remove when we remove DEPRECATED__ros. Hardcoded 'visualization_msgs/MarkerArray' flow.
  const memberKeys = node.members.map(({ name }) => name.getText());
  if (memberKeys.includes("markers")) {
    if (memberKeys.length > 1) {
      throw new DatatypeExtractionError({
        severity: DiagnosticSeverity.Error,
        message: `For marker return types, they must have only one property 'markers'. Please remove '${without(
          memberKeys,
          "markers"
        ).join(", ")}', or rename 'markers'.`,
        source: Sources.DatatypeExtraction,
        code: ErrorCodes.DatatypeExtraction.STRICT_MARKERS_RETURN_TYPE,
      });
    }

    return {
      outputDatatype: "visualization_msgs/MarkerArray",
      datatypes: baseDatatypes,
    };
  }

  let datatypes: RosDatatypes = {};

  const getRosMsgField = (
    name: string,
    tsNode: ts.Node,
    isArray: boolean = false,
    isComplex: boolean = false,
    typeMap: TypeMap = {},
    innerDepth: number = 1
  ): RosMsgField => {
    if (innerDepth > MAX_DEPTH) {
      throw new Error(`Max AST traversal depth exceeded.`);
    }

    switch (tsNode.kind) {
      case ts.SyntaxKind.InterfaceDeclaration:
      case ts.SyntaxKind.TypeLiteral: {
        const symbolName = tsNode.symbol.name;

        // The 'json' type is special because rosbagjs represents it as a primitive field
        if (isNodeFromRosModule(tsNode) && symbolName === "json") {
          return {
            name,
            type: "json",
            isArray: false,
            isComplex: false,
            arrayLength: undefined,
          };
        }

        const nestedType =
          isNodeFromRosModule(tsNode) && messageDefinitionMap[symbolName]
            ? messageDefinitionMap[symbolName]
            : `${currentDatatype}/${name}`;
        const { datatypes: nestedDatatypes } = constructDatatypes(
          checker,
          tsNode,
          nestedType,
          messageDefinitionMap,
          depth + 1,
          tsNode.typeParameters ? buildTypeMapFromParams(tsNode.typeParameters, typeMap) : typeMap
        );
        const childFields = nestedDatatypes[nestedType].fields;
        if (childFields.length === 2) {
          const secField = childFields.find((field) => field.name === "sec");
          const nsecField = childFields.find((field) => field.name === "nsec");
          if (
            secField &&
            nsecField &&
            !secField.isComplex &&
            !nsecField.isComplex &&
            !secField.isArray &&
            !nsecField.isArray
          ) {
            // TODO(JP): Might want to do some extra checks for types here. But then again,
            // "time" is just pretty awkward of a field in general; maybe we should instead
            // just get rid of it throughout our application and treat it as a regular nested object?
            return {
              name,
              type: "time",
              isArray: false,
              isComplex: false,
              arrayLength: undefined,
            };
          }
        }

        datatypes = { ...datatypes, ...nestedDatatypes };
        return {
          name,
          type: nestedType,
          isArray,
          isComplex: true,
          arrayLength: undefined,
        };
      }

      case ts.SyntaxKind.ArrayType: {
        return getRosMsgField(name, tsNode.elementType, true, true, typeMap, innerDepth + 1);
      }

      case ts.SyntaxKind.NumberKeyword:
        return {
          name,
          type: "float64",
          isArray,
          isComplex,
          arrayLength: undefined,
        };
      case ts.SyntaxKind.StringKeyword:
        return {
          name,
          type: "string",
          isArray,
          isComplex,
          arrayLength: undefined,
        };
      case ts.SyntaxKind.BooleanKeyword:
        return {
          name,
          type: "bool",
          isArray,
          isComplex,
          arrayLength: undefined,
        };

      case ts.SyntaxKind.TypeAliasDeclaration: {
        const newTypeParamMap = buildTypeMapFromParams(tsNode.typeParameters, typeMap);
        return getRosMsgField(name, tsNode.type, isArray, isComplex, newTypeParamMap, innerDepth + 1);
      }

      case ts.SyntaxKind.TypeReference: {
        const nextSymbol = checker.getSymbolAtLocation(tsNode.typeName);

        // There is a troubling discrepancy between how Typescript defines
        // array literals 'number[]' and arrays of the form 'Array<number>'.
        // In the latter case, as is handled here, 'Array' actually refers to
        // the 'lib.d.ts' declaration of 'Array', which puts into a bit of a
        // rabbit hole in terms of coming up with an appropriate ROS datatype.
        // One solution could potentially to 'cast' this node as an
        // ArrayTypeNode and recurse. Opting out of using 'Array' keyword for
        // now.
        if (nextSymbol.escapedName === "Array") {
          throw new DatatypeExtractionError(preferArrayLiteral);
        }

        const typeParam = findDeclaration(nextSymbol, [ts.SyntaxKind.TypeParameter]);
        if (typeParam) {
          if (typeParam.name && typeMap[typeParam.name.escapedText]) {
            let next = typeMap[typeParam.name.escapedText];
            while (next.parent) {
              next = next.parent;
            }
            return getRosMsgField(name, next.current, isArray, isComplex, typeMap, innerDepth + 1);
          }
          throw new Error(`Could not find type ${typeParam.getText()} in type map.`);
        }

        const nextNode = findDeclaration(nextSymbol, [
          ts.SyntaxKind.TypeAliasDeclaration,
          ts.SyntaxKind.InterfaceDeclaration,
          ts.SyntaxKind.ImportSpecifier,
          ts.SyntaxKind.ClassDeclaration,
        ]);

        return getRosMsgField(
          name,
          nextNode,
          isArray,
          isComplex,
          buildTypeMapFromArgs(tsNode.typeArguments, typeMap),
          innerDepth + 1
        );
      }
      // i.e. 'typeof'
      case ts.SyntaxKind.TypeQuery: {
        throw new DatatypeExtractionError(noTypeOfError);
      }

      case ts.SyntaxKind.ImportSpecifier: {
        const declaration = findImportedTypeDeclaration(checker, tsNode, [
          ts.SyntaxKind.TypeLiteral,
          ts.SyntaxKind.InterfaceDeclaration,
          ts.SyntaxKind.TypeAliasDeclaration,
        ]);
        return getRosMsgField(name, declaration, isArray, isComplex, typeMap, innerDepth + 1);
      }
      case ts.SyntaxKind.IntersectionType: {
        throw new DatatypeExtractionError(noIntersectionTypesError);
      }
      case ts.SyntaxKind.TupleType: {
        throw new DatatypeExtractionError(noTuples);
      }
      case ts.SyntaxKind.StringLiteral:
      case ts.SyntaxKind.NumericLiteral:
      case ts.SyntaxKind.LiteralType: {
        throw new DatatypeExtractionError(noTypeLiteralsError);
      }
      case ts.SyntaxKind.ClassDeclaration: {
        throw new DatatypeExtractionError(classError);
      }

      case ts.SyntaxKind.UnionType: {
        throw new DatatypeExtractionError(unionsError);
      }
      case ts.SyntaxKind.FunctionType:
        throw new DatatypeExtractionError(functionError);

      case ts.SyntaxKind.AnyKeyword:
        throw new DatatypeExtractionError(noNestedAny);

      default:
        throw new Error("Unhandled node kind.");
    }
  };

  const { members } = node;
  const rosMsgFields = members.map(({ type, name }) =>
    getRosMsgField(name.getText(), type, false, false, currentTypeParamMap, depth + 1)
  );

  return { outputDatatype: currentDatatype, datatypes: { ...datatypes, [currentDatatype]: { fields: rosMsgFields } } };
};
