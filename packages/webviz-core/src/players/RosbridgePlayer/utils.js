// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { rosPrimitives } from "webviz-core/src/components/MessageHistory/internalCommon";
import type { RosDatatypes, RosMsgField } from "webviz-core/src/types/RosDatatypes";

export type RoslibTypedef = {
  type: string,
  fieldtypes: string[],
  fieldnames: string[],
  fieldarraylen: number[],
  examples: string[],

  constnames: string[],
  constvalues: string[],
};

// Turn roslibjs type definitions into our own format.
export function messageDetailsToRosDatatypes(typedefs: RoslibTypedef[]): RosDatatypes {
  const datatypes: RosDatatypes = {};

  for (const typedef of typedefs) {
    // "time" and "duration" get sent by the rosapi service, even though they're primitives.
    if (typedef.type === "time" || typedef.type === "duration") {
      continue;
    }

    const fields: RosMsgField[] = [];
    for (let i = 0; i < typedef.fieldtypes.length; i++) {
      let type = typedef.fieldtypes[i];
      const name = typedef.fieldnames[i];
      const arraylen = typedef.fieldarraylen[i];

      // Deprecated aliases, but still being sent by the rosapi service.
      if (type === "char") {
        type = "uint8";
      } else if (type === "byte") {
        type = "int8";
      }

      const field: RosMsgField = { type, name };

      if (!rosPrimitives.includes(type)) {
        field.isComplex = true;
      }

      // "-1" means not an array, "0" means variable length, positive integer means fixed length.
      if (arraylen >= 0) {
        field.isArray = true;
        if (arraylen > 0) {
          field.arrayLength = arraylen;
        }
      }

      fields.push(field);
    }
    datatypes[typedef.type] = { fields };
  }
  return datatypes;
}

const SECS_ASCII_NUMBERS = "115,101,99,115";
const NSECS_ASCII_NUMBERS = "110,115,101,99,115";

// Do an in-place modification (for performance) of messages to turn them into our internal format.
export function sanitizeMessage(message: mixed): void {
  if (typeof message == "object" && message !== null) {
    // We don't want to iterate over byte arrays.
    if (message instanceof Uint8Array || message instanceof Int8Array) {
      return;
    }
    const keys = Object.keys(message);
    if (keys.length === 2 && typeof message.secs === "number" && typeof message.nsecs === "number") {
      // Turn { secs, nsecs } into { sec, nsec }
      // $FlowFixMe - modifying message
      message.sec = message.secs;
      // $FlowFixMe - modifying message
      message.nsec = message.nsecs;
      delete message.secs;
      delete message.nsecs;
    } else if (
      keys.length === 2 &&
      typeof message[SECS_ASCII_NUMBERS] === "number" &&
      typeof message[NSECS_ASCII_NUMBERS] === "number"
    ) {
      // Paving over a roslibjs bug: https://github.com/RobotWebTools/roslibjs/issues/349
      // $FlowFixMe - modifying message
      message.sec = message[SECS_ASCII_NUMBERS];
      // $FlowFixMe - modifying message
      message.nsec = message[NSECS_ASCII_NUMBERS];
      delete message[SECS_ASCII_NUMBERS];
      delete message[NSECS_ASCII_NUMBERS];
    } else {
      // Recurse down.
      for (const key of keys) {
        sanitizeMessage(message[key]);
      }
    }
  }
}
