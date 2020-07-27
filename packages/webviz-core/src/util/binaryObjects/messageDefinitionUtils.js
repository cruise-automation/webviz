// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { sum } from "lodash";
import memoize from "memoize-weak";

import type { RosMsgField, RosDatatypes } from "webviz-core/src/types/RosDatatypes";

const primitiveSizes = {
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

export const friendlyTypeName = (name: string): string => name.replace("/", "_");
