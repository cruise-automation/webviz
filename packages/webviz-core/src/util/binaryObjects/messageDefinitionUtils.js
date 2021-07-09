// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { sum } from "lodash";
import memoize from "memoize-weak";
import { type RosMsgField } from "rosbag";

import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";

const primitiveSizes = {
  json: 8,
  string: 8,
  bool: 1,
  int8: 1,
  uint8: 1,
  int16: 2,
  uint16: 2,
  int32: 4,
  uint32: 4,
  float32: 4,
  float64: 8,
  int64: 8,
  uint64: 8,
  time: 8,
  duration: 8,
};

export const primitiveList: Set<string> = new Set(Object.keys(primitiveSizes));

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

export const typeSize = memoize(
  (typesByName: RosDatatypes, typeName: string): number => {
    if (primitiveSizes[typeName] != null) {
      return primitiveSizes[typeName];
    }
    const messageType = typesByName[typeName];
    if (messageType == null) {
      throw new Error(`Unknown type: ${typeName}`);
    }
    // We add field sizes here, not type sizes. If the type has a field that's an array of strings,
    // it only adds eight bytes to the object's inline size.
    return sum(typesByName[typeName].fields.map((field) => fieldSize(typesByName, field)));
  }
);

// No point in memoizing this -- it can only do O(1) work before hitting `typeSize`, which is
// memoized. Memoizing on the string type name will work better than memoizing on field object
// identity, too.
export function fieldSize(typesByName: RosDatatypes, field: RosMsgField): number {
  if (field.isConstant) {
    return 0;
  }
  if (field.isArray) {
    // NOTE: Fixed-size arrays are not inlined.
    return 2 * primitiveSizes.int32;
  }
  return typeSize(typesByName, field.type);
}

// It's useful for field-accessor code for times and durations to share codepaths with field
// accessor code for complex message types. To do that, we add them to the set of messages.
// (Note, this might change depending on the code written next.)
export const addTimeTypes = (typesByName: RosDatatypes): RosDatatypes => ({
  ...typesByName,
  time: { fields: [{ name: "sec", type: "int32" }, { name: "nsec", type: "int32" }] },
  duration: { fields: [{ name: "sec", type: "int32" }, { name: "nsec", type: "int32" }] },
});

// String.prototype.replaceAll is not implemented in Chrome.
const allBadCharacters = new RegExp("[/-]", "g");
export const friendlyTypeName = (name: string): string => name.replace(allBadCharacters, "_");
export const deepParseSymbol = Symbol("deepParse");
type CommonBobjectSourceData = $ReadOnly<{|
  datatypes: RosDatatypes,
  datatype: string,
|}>;
export type BobjectSourceData =
  | CommonBobjectSourceData
  | $ReadOnly<{|
      ...CommonBobjectSourceData,
      buffer: ArrayBuffer, // Present in binary bobjects
      bigString: string,
      isArrayView: boolean,
    |}>;
export const classSourceData = new WeakMap<any, BobjectSourceData>();
export const associateSourceData = (cls: any, sourceData: BobjectSourceData): void => {
  classSourceData.set(cls, sourceData);
};
export const getSourceData = (cls: any): ?BobjectSourceData => classSourceData.get(cls);

// Note: returns false for "time" and "duration". Might be more useful not doing that.
// The RosMsgField flow-type has an `isComplex` field, but it isn't present for the websocket
// player, and has gone missing in test fixture before as well. Best to just assume it doesn't
// exist, because it's an annoying denormalization anyway.
export const isComplex = (typeName: string) => !primitiveList.has(typeName);

const numberList = ["int8", "uint8", "int16", "uint16", "int32", "uint32", "float32", "float64", "int64", "uint64"];
export const isNumberType = (typeName: string) => numberList.includes(typeName);
