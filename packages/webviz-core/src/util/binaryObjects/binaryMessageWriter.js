// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import indent from "indent-string";
import memoize from "memoize-weak";

import { addTimeTypes, fieldSize, friendlyTypeName, PointerExpression, typeSize } from "./messageDefinitionUtils";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";

export class BobWriter {
  _strings: string[]; // Un-joined bigString
  _bytesUsed: number;
  _stringStartCache: { [s: string]: number };
  _totalStringLength: number;

  // Not updated on reset:
  _storage: Uint8Array = new Uint8Array(100 * 1000);
  _view: DataView = new DataView(this._storage.buffer);

  constructor() {
    this.reset();
  }

  write() {
    const ret = { buffer: this._storage.buffer.slice(0, this._bytesUsed), bigString: this._strings.join("") };
    this.reset();
    return ret;
  }

  reset() {
    this._strings = [];
    this._bytesUsed = 0;
    this._stringStartCache = {};
    this._totalStringLength = 0;
  }

  alloc(bytes: number): { offset: number, view: DataView, storage: Uint8Array } {
    if (this._bytesUsed + bytes > this._storage.length) {
      let newSize = this._storage.length;
      while (newSize < this._bytesUsed + bytes) {
        newSize *= 2;
      }
      const newStorage = new Uint8Array(newSize);
      newStorage.set(this._storage);
      this._storage = newStorage;
      this._view = new DataView(this._storage.buffer);
    }
    const offset = this._bytesUsed;
    this._bytesUsed += bytes;
    return { offset, view: this._view, storage: this._storage };
  }

  string(s: string): number {
    const cachedValue = this._stringStartCache[s];
    if (cachedValue != null) {
      return cachedValue;
    }
    const start = this._totalStringLength;
    this._totalStringLength += s.length;
    this._strings.push(s);
    this._stringStartCache[s] = start;
    return start;
  }
}

// Writes a primitive value to the buffer. Handles nulls.
export function printStoreSingularVariable(
  datatypes: RosDatatypes,
  type: string,
  variableName: string,
  pointer: PointerExpression
) {
  switch (type) {
    case "json":
    case "string": {
      const statements = [];
      const stringVariableName = `${variableName}$str`;
      if (type === "json") {
        statements.push(
          `const ${stringVariableName} = JSON.stringify(${variableName} === undefined ? null : ${variableName});`
        );
      } else {
        statements.push(`const ${stringVariableName} = ${variableName} || "";`);
      }
      statements.push(`$view.setInt32(${pointer.toString()}, ${stringVariableName}.length, true);`);
      statements.push(`$view.setInt32(${pointer.add(4).toString()}, $writer.string(${stringVariableName}), true);`);
      return statements.join("\n");
    }
    case "bool":
      // `+undefined` is NaN, set(NaN) stores a zero. OK.
      return `$view.setUint8(${pointer.toString()}, +${variableName});`;
    case "int8":
      // View `set` methods for ints store zero when given `undefined`. OK.
      return `$view.setInt8(${pointer.toString()}, ${variableName});`;
    case "uint8":
      return `$view.setUint8(${pointer.toString()}, ${variableName});`;
    case "int16":
      return `$view.setInt16(${pointer.toString()}, ${variableName}, true);`;
    case "uint16":
      return `$view.setUint16(${pointer.toString()}, ${variableName}, true);`;
    case "int32":
      return `$view.setInt32(${pointer.toString()}, ${variableName}, true);`;
    case "uint32":
      return `$view.setUint32(${pointer.toString()}, ${variableName}, true);`;
    case "float32":
      // View `set` methods for floats store NaN when given `undefined`. OK?
      return `$view.setFloat32(${pointer.toString()}, ${variableName}, true);`;
    case "float64":
      return `$view.setFloat64(${pointer.toString()}, ${variableName}, true);`;
    case "int64":
      return `$view.setBigInt64(${pointer.toString()}, BigInt(${variableName} || 0), true);`;
    case "uint64":
      return `$view.setBigUint64(${pointer.toString()}, BigInt(${variableName} || 0), true);`;
  }
  const datatype = datatypes[type];
  if (!datatype) {
    throw new Error(`unknown type "${type}"`);
  }
  const endPointer = pointer.add(typeSize(datatypes, type));
  return `if (${variableName} == null) {
  $storage.fill(0, ${pointer.toString()}, ${endPointer.toString()});
} else {
  $write$${friendlyTypeName(type)}(${variableName}, ${pointer.toString()});
}`;
}

// Variable must be an array -- caller should null-check.
export function printStoreArray(
  datatypes: RosDatatypes,
  type: string,
  variableName: string,
  pointer: PointerExpression
) {
  const i = `${variableName}$i`;
  const element = `${variableName}$e`;
  const offset = `${variableName}$o`;
  const length = `${variableName}$l`;
  return `const ${length} = ${variableName}.length;
let ${offset} = $alloc(${length} * ${typeSize(datatypes, type)});
${printStoreSingularVariable(datatypes, "int32", length, pointer)}
${printStoreSingularVariable(datatypes, "int32", offset, pointer.add(4))}
for (let ${i} = 0; ${i} < ${length}; ++${i}) {
  const ${element} = ${variableName}[${i}];
${indent(printStoreSingularVariable(datatypes, type, element, new PointerExpression(offset)), 2)}
  ${offset} += ${typeSize(datatypes, type)};
}`;
}

// Handles nulls.
export function maybePrintStoreArray(
  datatypes: RosDatatypes,
  type: string,
  variableName: string,
  pointer: PointerExpression
) {
  // float64(0) is eight bytes of zeros.
  return `if (${variableName} == null) {
  ${printStoreSingularVariable(datatypes, "float64", "0", pointer)}
} else {
${indent(printStoreArray(datatypes, type, variableName, pointer), 2)}
}`;
}

export function printStoreMessageBody(
  datatypes: RosDatatypes,
  type: string,
  variableName: string,
  pointer: PointerExpression
) {
  const datatype = datatypes[type];
  if (!datatype) {
    throw new Error(`Unknown datatype ${type}`);
  }
  let offset = 0;
  return datatype.fields
    .filter(({ isConstant }) => !isConstant)
    .map((field) => {
      const fieldVariableName = `v$${field.name}`;
      const storeVariable = `const ${fieldVariableName} = ${variableName}.${field.name};`;
      const storeCode = field.isArray
        ? maybePrintStoreArray(datatypes, field.type, fieldVariableName, pointer.add(offset))
        : printStoreSingularVariable(datatypes, field.type, fieldVariableName, pointer.add(offset));
      offset += fieldSize(datatypes, field);
      return `${storeVariable}\n${storeCode}`;
    })
    .join("\n");
}

export function printStoreMessageFunction(datatypes: RosDatatypes, type: string) {
  return `function $write$${friendlyTypeName(type)}($v, $o) {
${indent(printStoreMessageBody(datatypes, type, "$v", new PointerExpression("$o")), 2)}
}
$functions[${JSON.stringify(type)}] = (message) => {
  const $ret = $alloc(${typeSize(datatypes, type)});
  $write$${friendlyTypeName(type)}(message, $ret);
  return $ret;
};`;
}

export function printSerializationCode(datatypes: RosDatatypes) {
  const functionBodies = Object.keys(datatypes).map((type) => printStoreMessageFunction(datatypes, type));
  return `const $functions = {};

let $view, $storage;
function $alloc(size) {
  const { view, storage, offset } = $writer.alloc(size);
  $view = view;
  $storage = storage;
  return offset;
}
$alloc(0);

${functionBodies.join("\n")}
return $functions;
`;
}

const getFunctionsUnmemoized = (
  datatypes: RosDatatypes,
  writer: BobWriter
): { [type: string]: (message: any) => void } => {
  /* eslint-disable no-new-func */
  // $FlowFixMe
  return Function("$writer", printSerializationCode(addTimeTypes(datatypes)))(writer);
  /* eslint-enable no-new-func */
};
export const getSerializeFunctions = memoize(getFunctionsUnmemoized);
