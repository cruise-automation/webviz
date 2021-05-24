// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { Buffer } from "buffer";
import int53 from "int53";

import { cast, type Bobject } from "webviz-core/src/players/types";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";
import { type ArrayView, getArrayView } from "webviz-core/src/util/binaryObjects/ArrayViews";
import getGetClassForView from "webviz-core/src/util/binaryObjects/binaryWrapperObjects";
import getJsWrapperClasses from "webviz-core/src/util/binaryObjects/jsWrapperObjects";
import {
  associateSourceData,
  deepParseSymbol,
  getSourceData,
  primitiveList,
} from "webviz-core/src/util/binaryObjects/messageDefinitionUtils";

const parseJson = (s) => {
  try {
    return JSON.parse(s);
  } catch (e) {
    return `Could not parse ${JSON.stringify(s)}`;
  }
};
const context = {
  Buffer,
  getArrayView,
  deepParse: deepParseSymbol,
  int53,
  associateSourceData,
  parseJson,
  offsetSymbol: Symbol(),
};

export type { ArrayView };

// Stored for top-level bobjects only.
const approximateBinarySizes = new WeakMap<any, number>();
const reverseWrappedBobjects = new WeakSet<any>();

export const getBinaryOffset = (obj: any): number => {
  const offset = obj[context.offsetSymbol];
  if (offset == null) {
    throw new Error("Can't get offset of non-binary bobject.");
  }
  return offset;
};

export const getBinaryArrayView = (
  typesByName: RosDatatypes,
  datatype: string,
  buffer: ArrayBuffer,
  bigString: string,
  firstElementOffset: number,
  length: number
): ArrayView<any> => {
  const Class = getGetClassForView(typesByName, datatype, true)(context, new DataView(buffer), bigString, typesByName);
  return new Class(firstElementOffset, length);
};

export const getObject = (
  typesByName: RosDatatypes,
  datatype: string,
  buffer: ArrayBuffer,
  bigString: string
): Bobject => {
  const Class = getGetClassForView(typesByName, datatype)(context, new DataView(buffer), bigString, typesByName);
  const ret = new Class(0);
  approximateBinarySizes.set(ret, buffer.byteLength + bigString.length);
  return ret;
};

export const getObjects = (
  typesByName: RosDatatypes,
  datatype: string,
  buffer: ArrayBuffer,
  bigString: string,
  offsets: $ReadOnlyArray<number>
): $ReadOnlyArray<Bobject> => {
  const Class = getGetClassForView(typesByName, datatype)(context, new DataView(buffer), bigString, typesByName);
  const ret = offsets.map((offset) => new Class(offset));
  // Super dumb heuristic: assume all of the bobjects in a block have the same size. We could do
  // better, but this is only used for memory cache eviction which we do a whole block at a time, so
  // we're only actually interested in the sum (which is correct, plus or minus floating point
  // error).
  const approximateSize = (buffer.byteLength + bigString.length) / offsets.length;
  ret.forEach((bobject) => {
    approximateBinarySizes.set(bobject, approximateSize);
  });
  return ret;
};

// True for "object bobjects" and array views.
export const isBobject = (object: ?any): boolean => object?.[deepParseSymbol] != null;
export const isArrayView = (object: any): boolean => isBobject(object) && object[Symbol.iterator] != null;

export const deepParse = (object: ?any): any => {
  if (object == null) {
    // Missing submessage fields are unfortunately common for constructed markers. This is not
    // principled, but it is pragmatic.
    return object;
  }
  if (!isBobject(object)) {
    // This is typically a typing mistake -- the user thinks they have a bobject but have a
    // primitive or a parsed message.
    throw new Error("Argument to deepParse is not a bobject");
  }
  return object[deepParseSymbol]();
};

export const wrapJsObject = <T>(typesByName: RosDatatypes, typeName: string, object: any): T => {
  if (!primitiveList.has(typeName) && !typesByName[typeName]) {
    throw new Error(`Message definition is not present for type ${typeName}.`);
  }
  const classes = getJsWrapperClasses(typesByName);
  const ret = new classes[typeName](object);
  reverseWrappedBobjects.add(ret);
  return cast<T>(ret);
};

// NOTE: The only guarantee is that the sum of the sizes of the bobjects in a given block are
// about right. Sizes are not available for submessages, only top-level bobjects.
// In the future we might make this accurate by getting the data from the binary rewrite step,
// or we might remove this function and just provide access to the identity of the underlying data
// so the shared storage is clear.
export const inaccurateByteSize = (obj: any): number => {
  const size = approximateBinarySizes.get(obj);
  if (size != null) {
    return size;
  }
  if (reverseWrappedBobjects.has(obj)) {
    // Not ideal: Storing the deep-parsed representation of a reverse-wrapped bobject actually
    // does take up memory -- and quite a bit of it. Unfortunately, we don't have a good heuristic
    // for reverse-wrapped bobject sizes.
    return 0;
  }
  throw new Error("Size of object not available");
};

export function bobjectFieldNames(bobject: {}): string[] {
  const sourceData = getSourceData(Object.getPrototypeOf(bobject).constructor);
  if (!sourceData) {
    throw new Error("Unknown constructor in bobjectFieldNames");
  }
  const { datatypes, datatype } = sourceData;
  const definition = datatypes[datatype];
  if (definition == null) {
    if (datatype === "time" || datatype === "duration") {
      return ["sec", "nsec"];
    }
    throw new Error(`Unknown datatype ${datatype}`);
  }
  return definition.fields.filter(({ isConstant }) => !isConstant).map(({ name }) => name);
}

export const fieldNames = (o: {}): string[] => {
  if (!isBobject(o)) {
    return Object.keys(o);
  }
  return bobjectFieldNames(o);
};

export const merge = <T: {}>(bobject: T, overrides: $ReadOnly<{ [field: string]: any }>): T => {
  if (!isBobject(bobject)) {
    throw new Error("Argument to merge is not a bobject");
  }
  const shallow = {};
  // Iterate over class's methods, except `constructor` which is special.
  bobjectFieldNames(bobject).forEach((field) => {
    shallow[field] = bobject[field]();
  });
  const sourceData = getSourceData(Object.getPrototypeOf(bobject).constructor);
  if (sourceData == null) {
    throw new Error("Unknown type in merge");
  }
  return cast<T>(wrapJsObject(sourceData.datatypes, sourceData.datatype, { ...shallow, ...overrides }));
};

// For accessing fields that might be in bobjects and might be in JS objects.
export const getField = (obj: ?any, field: string, bigInts: ?true): any => {
  if (!obj) {
    return;
  }
  if (isBobject(obj)) {
    return obj[field] && obj[field](bigInts);
  }
  return obj[field];
};

export const getIndex = (obj: any, i: number, bigInt: ?true): ?any => {
  if (!obj) {
    return;
  }
  if (isArrayView(obj)) {
    if (i < 0 || i >= obj.length() || !Number.isInteger(i)) {
      return;
    }
    return obj.get(i, bigInt);
  }
  return obj[i];
};

// Get an individual field by traversing a path of keys and indices
export const getFieldFromPath = (obj: any, path: (string | number)[]): any => {
  let ret = obj;
  for (const field of path) {
    ret = typeof field === "string" ? getField(ret, field) : getIndex(ret, field);
  }
  return ret;
};
