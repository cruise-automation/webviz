// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import indent from "indent-string";
import memoize from "memoize-weak";
import { type RosMsgField } from "rosbag";

import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";
import {
  addTimeTypes,
  friendlyTypeName,
  fieldSize,
  isComplex,
  PointerExpression,
  typeSize,
} from "webviz-core/src/util/binaryObjects/messageDefinitionUtils";

// Exported for tests
export const printSingularExpression = (
  typesByName: RosDatatypes,
  type: string,
  pointer: PointerExpression,
  inFieldDefinitionBody: ?true
): string => {
  if (typesByName[type] || type === "time" || type === "duration") {
    return `new ${friendlyTypeName(type)}(${pointer.toString()})`;
  }
  if (inFieldDefinitionBody && (type === "int64" || type === "uint64")) {
    const floatExpression = printPrimitiveSingularExpression(type, pointer, false);
    const bigIntExpression = printPrimitiveSingularExpression(type, pointer, true);
    return `(bigInt ? ${bigIntExpression}: ${floatExpression})`;
  }
  return printPrimitiveSingularExpression(type, pointer, false);
};

function printPrimitiveSingularExpression(type: string, pointer: PointerExpression, bigInts: boolean) {
  switch (type) {
    case "json":
    case "string": {
      const length = `$view.getInt32(${pointer.toString()}, true)`;
      const startIndex = `$view.getInt32(${pointer.add(4).toString()}, true)`;
      const stringExpression = `$bigString.substr(${startIndex}, ${length})`;
      return type === "string" ? stringExpression : `$context.parseJson(${stringExpression})`;
    }
    case "bool":
      return `($view.getUint8(${pointer.toString()}) !== 0)`;
    case "int8":
      return `$view.getInt8(${pointer.toString()})`;
    case "uint8":
      return `$view.getUint8(${pointer.toString()})`;
    case "int16":
      return `$view.getInt16(${pointer.toString()}, true)`;
    case "uint16":
      return `$view.getUint16(${pointer.toString()}, true)`;
    case "int32":
      return `$view.getInt32(${pointer.toString()}, true)`;
    case "uint32":
      return `$view.getUint32(${pointer.toString()}, true)`;
    case "float32":
      return `$view.getFloat32(${pointer.toString()}, true)`;
    case "float64":
      return `$view.getFloat64(${pointer.toString()}, true)`;
    case "int64": {
      if (bigInts) {
        return `$view.getBigInt64(${pointer.toString()}, true)`;
      }
      return `$int53.readInt64LE($buffer, ${pointer.toString()})`;
    }
    case "uint64": {
      if (bigInts) {
        return `$view.getBigUint64(${pointer.toString()}, true)`;
      }
      return `$int53.readUInt64LE($buffer, ${pointer.toString()})`;
    }
  }
  throw new Error(`unknown type "${type}"`);
}

const arrayTypeName = (typeName: string): string => `${friendlyTypeName(typeName)}$Array`;

const printFieldDefinitionBody = (
  typesByName: RosDatatypes,
  field: RosMsgField,
  pointer: PointerExpression
): string => {
  if (field.isConstant) {
    const value = JSON.stringify(field.value);
    if (value == null) {
      throw new Error(`Could not serialize constant value for field ${field.name}`);
    }
    return `return ${value};`;
  }
  if (field.isArray) {
    const length = `const length = $view.getInt32(${pointer.toString()}, true);`;
    const from = `const from = $view.getInt32(${pointer.add(4).toString()}, true);`;
    if (field.type === "int8" || field.type === "uint8") {
      const arrayType = field.type === "int8" ? "Int8Array" : "Uint8Array";
      return [from, length, `return new ${arrayType}($arrayBuffer, from, length);`].join("\n");
    }
    const arrayType = arrayTypeName(field.type);
    return [from, length, `return new ${arrayType}(from, length);`].join("\n");
  }
  return `return ${printSingularExpression(typesByName, field.type, pointer, true)};`;
};

// Exported for tests
export const printFieldDefinition = (
  typesByName: RosDatatypes,
  field: RosMsgField,
  pointer: PointerExpression
): string => {
  const body = printFieldDefinitionBody(typesByName, field, pointer);
  // 64-bit integer getters have an optional bigInt argument to control the return type.
  const args = ["int64", "uint64"].includes(field.type) ? "bigInt" : "";
  return [`${field.name}(${args}) {`, indent(body, 2), "}"].join("\n");
};

// We deep-parse many messages in full, so it needs to be as efficient as possible. We avoid the
// cost of bobject-instantiation in the tight deep-parse codepaths by using the data directly. This
// unfortunately results in some duplicated code.
const printDeepParseField = (
  typesByName: RosDatatypes,
  { isArray, name, type }: RosMsgField,
  pointer: PointerExpression
): string => {
  if (isArray) {
    const ret = [
      `const ${name}$length = $view.getInt32(${pointer.toString()}, true);`,
      `const ${name}$from = $view.getInt32(${pointer.add(4).toString()}, true);`,
    ];
    if (type === "int8") {
      ret.push(`this.${name} = new Int8Array($arrayBuffer, ${name}$from, ${name}$length);`);
    } else if (type === "uint8") {
      ret.push(`this.${name} = new Uint8Array($arrayBuffer, ${name}$from, ${name}$length);`);
    } else {
      const elementSize = typeSize(typesByName, type);
      ret.push(`const ${name}$arr = new Array(${name}$length);`);
      ret.push(`for (let $ptr = ${name}$from, $i = 0; $i < ${name}$length; $ptr += ${elementSize}) {`);
      if (isComplex(type) || type === "time" || type === "duration") {
        ret.push(`  ${name}$arr[$i++] = new deepParse$${friendlyTypeName(type)}($ptr);`);
      } else {
        const loopPointer = new PointerExpression("$ptr");
        ret.push(`  ${name}$arr[$i++] = ${printPrimitiveSingularExpression(type, loopPointer, false)};`);
      }
      ret.push("}");
      ret.push(`this.${name} = ${name}$arr;`);
    }
    return ret.join("\n");
  }
  if (isComplex(type) || type === "time" || type === "duration") {
    return `this.${name} = new deepParse$${friendlyTypeName(type)}(${pointer.toString()});`;
  }
  return `this.${name} = ${printPrimitiveSingularExpression(type, pointer, false)};`;
};

const printDeepParseFunction = (typesByName: RosDatatypes, typeName: string): string => {
  const type = typesByName[typeName];
  if (type == null) {
    throw new Error(`Unknown type "${typeName}"`);
  }

  let pointer = new PointerExpression("$offset");
  const fieldExpressions = type.fields
    .filter(({ isConstant }) => !isConstant)
    .map((field) => {
      const ret = printDeepParseField(typesByName, field, pointer);
      pointer = pointer.add(fieldSize(typesByName, field));
      return ret;
    });
  return `function deepParse$${friendlyTypeName(typeName)}($offset) {
${indent(fieldExpressions.join("\n"), 2)}
}`;
};

const printDeepParseMethod = (typeName: string): string => {
  return `[$deepParse]() {
  return new deepParse$${friendlyTypeName(typeName)}(this[$offset]);
}`;
};

const printClassDefinition = (typesByName: RosDatatypes, typeName: string): string => {
  let pointer = new PointerExpression("this[$offset]");
  const type = typesByName[typeName];
  if (type == null) {
    throw new Error(`Unknown type "${typeName}"`);
  }
  const fieldDefinitions = type.fields.map((field) => {
    const definition = indent(printFieldDefinition(typesByName, field, pointer), 2);
    pointer = pointer.add(fieldSize(typesByName, field));
    return definition;
  });
  return `class ${friendlyTypeName(typeName)} {
  constructor(offset) {
    this[$offset] = offset;
  }
${fieldDefinitions.join("\n")}
${indent(printDeepParseMethod(typeName), 2)}
}
${printDeepParseFunction(typesByName, typeName)}
$context.associateSourceData(${friendlyTypeName(typeName)}, { datatypes: $typesByName, datatype: ${JSON.stringify(
    typeName
  )}, buffer: $arrayBuffer, bigString: $bigString })`;
};

// Things we need to include in the source:
type TypesUsed = $ReadOnly<{| arrayTypes: Set<string>, classes: Set<string> |}>;

const getTypesUsed = (typesByName: RosDatatypes, typeName: string): TypesUsed => {
  let frontier = [typeName].filter((t) => isComplex(t) || t === "time" || t === "duration");
  const arrayTypes = new Set<string>();
  const classes = new Set<string>(frontier);

  // Breadth-first enumeration of types and arrays.
  while (frontier.length > 0) {
    const nextFrontier = [];
    for (const nextTypeName of frontier) {
      const nextType = typesByName[nextTypeName];
      if (nextType == null) {
        throw new Error(`Unknown type ${nextTypeName}`);
      }
      nextType.fields.forEach((field) => {
        if (field.isConstant) {
          return;
        }
        if (field.type === "time" || field.type === "duration") {
          classes.add(field.type);
        }
        if (field.isArray && field.type !== "int8" && field.type !== "uint8") {
          // We used typed arrays for int8 and uint8.
          arrayTypes.add(field.type);
        }
        if (isComplex(field.type)) {
          if (!classes.has(field.type)) {
            classes.add(field.type);
            nextFrontier.push(field.type);
          }
        }
      });
    }
    frontier = nextFrontier;
  }
  return { arrayTypes, classes };
};

// Exported for tests
export const printGetClassForView = (
  inputTypesByName: RosDatatypes,
  topLevelTypeName: string,
  getArrayView: boolean
): string => {
  const typesByName = addTimeTypes(inputTypesByName);
  const { arrayTypes, classes } = getTypesUsed(typesByName, topLevelTypeName);
  if (getArrayView) {
    arrayTypes.add(topLevelTypeName);
  }
  const returnClassName = getArrayView ? arrayTypeName(topLevelTypeName) : friendlyTypeName(topLevelTypeName);

  const classDefinitions = [...classes].map((typeName) => printClassDefinition(typesByName, typeName));
  const arrays = [...arrayTypes].map((typeName) => {
    const className = arrayTypeName(typeName);
    const size = typeSize(typesByName, typeName);
    const getElement = printSingularExpression(typesByName, typeName, new PointerExpression("offset"));
    const getBigIntElement = ["int64", "uint64"].includes(typeName)
      ? `, (offset) => ${printPrimitiveSingularExpression(typeName, new PointerExpression("offset"), true)}`
      : "";
    return `const ${className} = $context.getArrayView((offset) => ${getElement}, ${size}${getBigIntElement});
$context.associateSourceData(${className}, { datatypes: $typesByName, datatype: ${JSON.stringify(
      typeName
    )}, buffer: $arrayBuffer, bigString: $bigString, isArrayView: true });`;
  });
  return `const $offset = $context.offsetSymbol;
const $deepParse = $context.deepParse;
const $int53 = $context.int53;
const $arrayBuffer = $view.buffer;
const $buffer = $context.Buffer.from($arrayBuffer);
${classDefinitions.join("\n")}
${arrays.join("\n")}
return ${returnClassName};`;
};

// Performance suffers if we generate functions for every topic/block -- too much code means no code
// is very "hot", and the JIT probably refuses to optimize it. Memoize the codegen and function
// instantiation so we can share definitions between topics and blocks.
const getGetClassForView = memoize((typesByName: RosDatatypes, typeName: string, getArrayView: ?boolean) => {
  /* eslint-disable no-new-func */
  // $FlowFixMe
  return Function(
    "$context",
    "$view",
    "$bigString",
    "$typesByName",
    printGetClassForView(typesByName, typeName, getArrayView ?? false)
  );
  /* eslint-enable no-new-func */
});

export default getGetClassForView;
