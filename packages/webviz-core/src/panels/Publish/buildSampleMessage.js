// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";

export const builtinSampleValues = {
  bool: false,
  int8: 0,
  uint8: 0,
  int16: 0,
  uint16: 0,
  int32: 0,
  uint32: 0,
  int64: 0,
  uint64: 0,
  float32: 0,
  float64: 0,
  string: "",
  time: { sec: 0, nsec: 0 },
  duration: { sec: 0, nsec: 0 },
};

export default function buildSampleMessage(datatypes: RosDatatypes, datatype: string): ?any {
  const builtin = builtinSampleValues[datatype];
  if (builtin != null) {
    return builtin;
  }
  const fields = datatypes[datatype].fields;
  if (!fields) {
    return null;
  }
  const obj = {};
  for (const field of fields) {
    if (field.isConstant) {
      continue;
    }
    const sample = buildSampleMessage(datatypes, field.type);
    if (field.isArray) {
      if (field.arrayLength != null) {
        obj[field.name] = new Array(field.arrayLength).fill(sample);
      } else {
        obj[field.name] = [sample];
      }
    } else {
      obj[field.name] = sample;
    }
  }
  return obj;
}
