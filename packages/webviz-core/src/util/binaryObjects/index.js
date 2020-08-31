// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import int53 from "int53";

import type { Bobject } from "webviz-core/src/players/types";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";
import getArrayView from "webviz-core/src/util/binaryObjects/ArrayView";
import getGetClassForView from "webviz-core/src/util/binaryObjects/binaryWrapperObjects";
import getJsWrapperClasses from "webviz-core/src/util/binaryObjects/jsWrapperObjects";
import {
  associateDatatypes,
  deepParseSymbol,
  getDatatypes,
  primitiveList,
} from "webviz-core/src/util/binaryObjects/messageDefinitionUtils";

const context = { Buffer, getArrayView, deepParse: deepParseSymbol, int53 };

const bobjectSizes = new WeakMap<any, number>();
const reverseWrappedBobjects = new WeakSet<any>();

export type ArrayView<T> = $ReadOnly<{
  get: (index: number) => T,
  length: () => number,
  @@iterator(): Iterator<T>,
  toArray: () => T[],
}>;

export const getObject = (
  typesByName: RosDatatypes,
  datatype: string,
  buffer: ArrayBuffer,
  bigString: string
): Bobject => {
  const Class = getGetClassForView(typesByName, datatype)(context, new DataView(buffer), bigString);
  associateDatatypes(Class, [typesByName, datatype]);
  const ret = new Class(0);
  bobjectSizes.set(ret, buffer.byteLength + bigString.length);
  return ret;
};

export const getObjects = (
  typesByName: RosDatatypes,
  datatype: string,
  buffer: ArrayBuffer,
  bigString: string,
  offsets: $ReadOnlyArray<number>
): $ReadOnlyArray<Bobject> => {
  const Class = getGetClassForView(typesByName, datatype)(context, new DataView(buffer), bigString);
  associateDatatypes(Class, [typesByName, datatype]);
  const ret = offsets.map((offset) => new Class(offset));
  ret.forEach((bobject) => {
    // Super dumb heuristic: assume all of the bobjects have the same size. We can do better because
    // we have the offset, and we could even get the exact amount from the rewriter, but this is
    // only used for memory cache eviction which we do a whole block at a time, so we're only
    // actually interested in the sum (which is correct, plus or minus floating point error).
    bobjectSizes.set(bobject, (buffer.byteLength + bigString.length) / offsets.length);
  });
  return ret;
};

export const isBobject = (object: any): boolean => object[deepParseSymbol] != null;

export const deepParse = (object: any): any => {
  if (!isBobject(object)) {
    throw new Error("Argument to deepParse is not a bobject");
  }
  return object[deepParseSymbol]();
};

export const wrapJsObject = (typesByName: RosDatatypes, typeName: string, object: any): Bobject => {
  if (!primitiveList.has(typeName) && !typesByName[typeName]) {
    throw new Error("Message definition is not present.");
  }
  const classes = getJsWrapperClasses(typesByName);
  const ret = new classes[typeName](object);
  reverseWrappedBobjects.add(ret);
  return ret;
};

// NOTE: The only guarantee is that the sum of the sizes of the bobjects in a given block are
// about right. Sizes are not available for submessages, only top-level bobjects.
// In the future we might make this accurate by getting the data from the binary rewrite step,
// or we might remove this function and just provide access to the identity of the underlying data
// so the shared storage is clear.
export const inaccurateByteSize = (obj: any): number => {
  const ret = bobjectSizes.get(obj);
  if (ret == null) {
    if (reverseWrappedBobjects.has(obj)) {
      // Not ideal: Storing the deep-parsed representation of a reverse-wrapped bobject actually
      // does take up memory -- and quite a bit of it. Unfortunately, we don't have a good heuristic
      // for reverse-wrapped bobject sizes.
      return 0;
    }
    throw new Error("Size of object not available");
  }
  return ret;
};

export const merge = (bobject: any, overrides: $ReadOnly<{ [field: string]: any }>): Bobject => {
  if (!isBobject(bobject)) {
    throw new Error("Argument to merge is not a bobject");
  }
  const shallow = {};
  // Iterate over class's methods, except `constructor` which is special.
  const cls = Object.getPrototypeOf(bobject);
  Object.getOwnPropertyNames(cls).forEach((field) => {
    if (field === "constructor") {
      return;
    }
    shallow[field] = bobject[field]();
  });
  const datatypes = getDatatypes(cls.constructor);
  if (datatypes == null) {
    throw new Error("Unknown type in merge");
  }
  return wrapJsObject(datatypes[0], datatypes[1], { ...shallow, ...overrides });
};
