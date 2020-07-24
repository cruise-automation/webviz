// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import indent from "indent-string";

import type { RosDatatypes, RosMsgField } from "webviz-core/src/types/RosDatatypes";
import { addTimeTypes, friendlyTypeName, fieldSize } from "webviz-core/src/util/binaryObjects/messageDefinitionUtils";

// Exported for tests
export class PointerExpression {
  variable: string;
  constant: number;

  constructor(variable: string, _constant: number = 0) {
    this.variable = variable;
    this.constant = _constant;
  }
  toString() {
    if (this.constant === 0) {
      return this.variable;
    }
    return `(${this.variable} + ${this.constant})`;
  }
  add(o: number) {
    return new PointerExpression(this.variable, this.constant + o);
  }
}

// Exported for tests
export const printSingularExpression = (
  typesByName: RosDatatypes,
  type: string,
  pointer: PointerExpression
): string => {
  if (typesByName[type] || type === "time" || type === "duration") {
    return `new ${friendlyTypeName(type)}(${pointer.toString()})`;
  }
  switch (type) {
    case "string": {
      const startIndex = `$view.getInt32(${pointer.toString()}, true)`;
      const endIndex = `$view.getInt32(${pointer.add(4).toString()}, true)`;
      return `$bigString.slice(${startIndex}, ${endIndex})`;
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
    case "int64":
      // NOTE, these have been translated from integers to floats in the binary earlier, but not in
      // the message definitions.
      return `$view.getFloat64(${pointer.toString()}, true)`;
    case "uint64":
      // NOTE, these have been translated from integers to floats in the binary earlier, but not in
      // the message definitions.
      return `$view.getFloat64(${pointer.toString()}, true)`;
  }
  throw new Error(`unknown type "${type}"`);
};

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
    const from = `const from = $view.getInt32(${pointer.toString()}, true);`;
    const to = `const to = $view.getInt32(${pointer.add(4).toString()}, true);`;
    if (field.type === "int8" || field.type === "uint8") {
      const arrayType = field.type === "int8" ? "Int8Array" : "Uint8Array";
      return [from, to, `return new ${arrayType}($view.buffer, from, to - from);`].join("\n");
    }
    const arrayType = `${friendlyTypeName(field.type)}$Array`;
    return [from, to, `return new ${arrayType}(from, to);`].join("\n");
  }
  return `return ${printSingularExpression(typesByName, field.type, pointer)};`;
};

// Exported for tests
export const printFieldDefinition = (
  typesByName: RosDatatypes,
  field: RosMsgField,
  pointer: PointerExpression
): string => {
  const body = printFieldDefinitionBody(typesByName, field, pointer);
  const maybeStatic = field.isConstant ? "static " : "";
  return [`${maybeStatic}${field.name}() {`, indent(body, 2), "}"].join("\n");
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
}`;
};

// Exported for tests
export const printGetClassesForView = (incompleteTypesByName: RosDatatypes): string => {
  const typesByName = addTimeTypes(incompleteTypesByName);

  const classes = Object.keys(typesByName).map((typeName) => printClassDefinition(typesByName, typeName));
  // TODO: Define the array-wrapper types.
  const classObjectEntries = Object.keys(typesByName).map((typeName) =>
    indent(`${JSON.stringify(typeName)}: ${friendlyTypeName(typeName)},`, 2)
  );
  return `const $offset = Symbol();
${classes.join("\n")}
return {
${classObjectEntries.join("\n")}
};`;
};

type GetClassesForView = (view: DataView, string) => { [datatype: string]: any };

export const getGetClassesForView = (typesByName: RosDatatypes): GetClassesForView => {
  // TODO: Depending on performance measurements, we might want to do this separately for the top-
  // level type for each topic, instead of doing it for every known datatype. This will mean finding
  // the transitive closure of datatypes from the topic type (which we probably need to do to find
  // the set of array types we want to instantiate anyway.)
  // eslint-disable-next-line no-new-func
  return new Function("$view", "$bigString", printGetClassesForView(typesByName));
};
