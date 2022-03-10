// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { type RosMsgDefinition } from "rosbag";

import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";

// For one datatype in the datatypes, find the RosMsgDefinition that we can use to either write or parse it.
// `datatypes` should contain the root datatype and all complex sub-datatypes.
export default function rosDatatypesToMessageDefinition(
  datatypes: RosDatatypes,
  rootDatatypeId: string
): RosMsgDefinition[] {
  const result = [];
  const seenDatatypeIds = new Set([rootDatatypeId]);
  // It doesn't matter if we use a stack or queue here, but we use a stack.
  const datatypeIdStack = [rootDatatypeId];

  while (datatypeIdStack.length) {
    const currentDatatypeId = datatypeIdStack.pop();
    const currentDatatype = datatypes[currentDatatypeId];
    if (!currentDatatype) {
      throw new Error(
        `While searching datatypes for "${rootDatatypeId}", could not find datatype "${currentDatatypeId}"`
      );
    }
    result.push({ name: currentDatatype.name, definitions: currentDatatype.fields });
    for (const field of currentDatatype.fields) {
      // Only search subfields if we haven't already seen it and it is "complex", IE it has its own fields and should
      // be contained in `datatypes`.
      if (field.isComplex && !seenDatatypeIds.has(field.type)) {
        datatypeIdStack.push(field.type);
        seenDatatypeIds.add(field.type);
      }
    }
  }

  return result;
}
