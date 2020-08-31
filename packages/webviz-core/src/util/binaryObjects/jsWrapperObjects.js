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
import { deepParse, isBobject } from "webviz-core/src/util/binaryObjects";
import {
  addTimeTypes,
  associateDatatypes,
  deepParseSymbol,
  friendlyTypeName,
} from "webviz-core/src/util/binaryObjects/messageDefinitionUtils";

class PrimitiveArrayWrapper<T> {
  value: T[];
  constructor(value: T[]) {
    this.value = value;
  }
  get(index: number) {
    return this.value[index];
  }
  length() {
    return this.value.length;
  }
  // https://stackoverflow.com/questions/48491307/iterable-class-in-flow
  /*::
  @@iterator(): Iterator<T> {
    // $FlowFixMe
    return this[Symbol.iterator]()
  }
  */
  // $FlowFixMe
  *[Symbol.iterator](): Iterable<T> {
    for (const o of this.value) {
      yield o;
    }
  }
  // Use deepParse(arr)
  // $FlowFixMe
  [deepParseSymbol](): T[] {
    return this.value;
  }
  toArray(): T[] {
    return this.value;
  }
}

const getReverseArrayWrapper = <T>(Class) =>
  class {
    value: T[];
    constructor(value: T[]) {
      this.value = value;
    }
    get(index: number) {
      return new Class(this.value[index]);
    }
    length(): number {
      return this.value.length;
    }
    // https://stackoverflow.com/questions/48491307/iterable-class-in-flow
    /*::
    @@iterator(): Iterator<T> {
      // $FlowFixMe
      return this[Symbol.iterator]()
    }
    */
    // $FlowFixMe
    *[Symbol.iterator](): Iterable<T> {
      for (const o of this.value) {
        yield isBobject(o) ? o : new Class(o);
      }
    }
    // Use deepParse(arr)
    // $FlowFixMe
    [deepParseSymbol](): T[] {
      return this.value.map((o) => (isBobject(o) ? deepParse(o) : deepParse(new Class(o))));
    }
    toArray(): T[] {
      const ret = [];
      let i = 0;
      for (const o of this) {
        ret[i] = o;
        i += 1;
      }
      return ret;
    }
  };

const arrayTypeName = (typeName: string): string => `${friendlyTypeName(typeName)}$Array`;

const printFieldDefinitionBody = (field: RosMsgField): string => {
  if (field.isConstant) {
    const value = JSON.stringify(field.value);
    if (value == null) {
      throw new Error(`Could not serialize constant value for field ${field.name}`);
    }
    return `return ${value};`;
  }
  const complexExpression = (type) => `const $fieldValue = this[$value].${field.name};
if ($fieldValue == null || $fieldValue[$deepParse] != null) {
  return $fieldValue;
}
return new ${type}($fieldValue);`;
  if (field.isArray && field.type !== "int8" && field.type !== "uint8") {
    if (field.isComplex || field.type === "time" || field.type === "duration") {
      return complexExpression(arrayTypeName(field.type));
    }
    return complexExpression("$PrimitiveArrayWrapper");
  }
  if (field.isComplex || field.type === "time" || field.type === "duration") {
    return complexExpression(friendlyTypeName(field.type));
  }
  // Primitives and byte arrays -- just return as-is, no bobject or null checks.
  return `return this[$value].${field.name};`;
};

// Exported for tests
export const printFieldDefinition = (field: RosMsgField): string => {
  const body = printFieldDefinitionBody(field);
  return [`${field.name}() {`, indent(body, 2), "}"].join("\n");
};

const deepParseFieldExpression = ({ name, type, isArray, isComplex }) => {
  const isRealArray = isArray && type !== "int8" && type !== "uint8";
  const isRealComplex = isComplex || type === "time" || type === "duration";
  if (isRealArray || isRealComplex) {
    return `$maybeDeepParse(this.${name}())`;
  }
  // Primitives and byte arrays -- just return as-is, no bobject or null checks.
  return `this[$value].${name}`;
};

const printClassDefinition = (typesByName: RosDatatypes, typeName: string): string => {
  const type = typesByName[typeName];
  if (type == null) {
    throw new Error(`Unknown type "${typeName}"`);
  }
  const fieldDefinitions = type.fields.map((field) => indent(printFieldDefinition(field), 2));

  const deepParseFieldExpressions = type.fields
    .filter(({ isConstant }) => !isConstant)
    .map((field) => `${field.name}: ${deepParseFieldExpression(field)},`);

  return `class ${friendlyTypeName(typeName)} {
  constructor(value) {
    this[$value] = value;
  }
${fieldDefinitions.join("\n")}
  [$deepParse]() {
    return {
${indent(deepParseFieldExpressions.join("\n"), 6)}
    };
  }
}
const ${arrayTypeName(typeName)} = $context.getReverseArrayWrapper(${friendlyTypeName(typeName)});
`;
};

// Exported for tests
export const printClasses = (inputTypesByName: RosDatatypes): string => {
  const typesByName = addTimeTypes(inputTypesByName);
  const classDefinitions = Object.keys(typesByName).map((typeName) => printClassDefinition(typesByName, typeName));

  const classExpressions = Object.keys(typesByName).map(
    (typeName) => `${JSON.stringify(typeName)}: ${friendlyTypeName(typeName)},`
  );

  // Add "maybe deep parse" because `msg.field()?.[$deepParse]()` isn't supported in node.
  return `const $value = Symbol();
const $deepParse = $context.deepParse;
const $maybeDeepParse = (o) => o && o[$deepParse]()
const $PrimitiveArrayWrapper = $context.PrimitiveArrayWrapper;
${classDefinitions.join("\n")}

return {
${indent(classExpressions.join("\n"), 2)}
};`;
};

const getJsWrapperClasses = memoize(
  (typesByName: RosDatatypes): { [typeName: string]: any } => {
    const context = { deepParse: deepParseSymbol, PrimitiveArrayWrapper, getReverseArrayWrapper };
    /* eslint-disable no-new-func */
    // $FlowFixMe
    const classes = Function("$context", printClasses(typesByName))(context);
    /* eslint-enable no-new-func */
    Object.keys(classes).forEach((name) => {
      associateDatatypes(classes[name], [typesByName, name]);
    });
    return classes;
  }
);

export default getJsWrapperClasses;
