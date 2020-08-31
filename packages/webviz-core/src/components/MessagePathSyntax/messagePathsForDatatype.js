// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { memoize } from "lodash";
import memoizeWeak from "memoize-weak";

import {
  type MessagePathPart,
  rosPrimitives,
  type RosPrimitive,
  type MessagePathStructureItem,
  type MessagePathStructureItemMessage,
} from "./constants";
import { isTypicalFilterName } from "webviz-core/src/components/MessagePathSyntax/isTypicalFilterName";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";
import naturalSort from "webviz-core/src/util/naturalSort";

// Generate an easily navigable flat structure given some `datatypes`. We cache
// this loosely as `datatypes` don't change after the player has connected.
// The structure looks something like this:
//
// {
//   "/datatype/name": {
//     structureType: "message",
//     nextByName: {
//       "some-sub-field": {
//         structureType: "primitive",
//         primitiveType: "uint8",
//       }
//       "some-boolean-array-sub-field": {
//         structureType: "array",
//         next: {
//           structureType: "primitive",
//           primitiveType: "bool"
//         }
//       }
//     }
//   }
// }
let lastDatatypes;
let lastStructures;
export function messagePathStructures(datatypes: RosDatatypes): { [string]: MessagePathStructureItemMessage } {
  if (lastDatatypes !== datatypes) {
    lastDatatypes = undefined;
    const structureFor = memoize(
      (datatype: string): MessagePathStructureItemMessage => {
        const nextByName: { [string]: MessagePathStructureItem } = {};
        const rosDatatype = datatype === "json" ? { fields: [] } : datatypes[datatype];
        if (!rosDatatype) {
          throw new Error(`datatype not found: "${datatype}"`);
        }
        rosDatatype.fields.forEach((msgField) => {
          if (msgField.isConstant) {
            return;
          }

          const next = rosPrimitives.includes(msgField.type)
            ? {
                structureType: "primitive",
                primitiveType: ((msgField.type: any): RosPrimitive), // Flow doesn't understand includes()
                datatype,
              }
            : structureFor(msgField.type);

          if (msgField.isArray) {
            nextByName[msgField.name] = { structureType: "array", next, datatype };
          } else {
            nextByName[msgField.name] = next;
          }
        });
        return { structureType: "message", nextByName, datatype };
      }
    );

    lastStructures = {};
    Object.keys(datatypes).forEach((datatype) => {
      lastStructures[datatype] = structureFor(datatype);
    });
    lastDatatypes = datatypes; // Set at the very end, in case there's an error earlier.
  }
  return lastStructures;
}

export function validTerminatingStructureItem(
  structureItem: ?MessagePathStructureItem,
  validTypes: ?(string[])
): boolean {
  return (
    !!structureItem &&
    (!validTypes ||
      validTypes.includes(structureItem.structureType) ||
      (structureItem.structureType === "primitive" && validTypes.includes(structureItem.primitiveType)))
  );
}

// Given a datatype, the array of datatypes, and a list of valid types,
// list out all valid strings for the `messagePath` part of the path (sorted).
export function messagePathsForDatatype(
  datatype: string,
  datatypes: RosDatatypes,
  validTypes: ?(string[]),
  noMultiSlices: ?boolean,
  messagePath?: MessagePathPart[] = []
): string[] {
  let clonedMessagePath = [...messagePath];
  const messagePaths = [];
  function traverse(structureItem: MessagePathStructureItem, builtString: string) {
    if (validTerminatingStructureItem(structureItem, validTypes)) {
      messagePaths.push(builtString);
    }
    if (structureItem.structureType === "message") {
      for (const name of Object.keys(structureItem.nextByName)) {
        traverse(structureItem.nextByName[name], `${builtString}.${name}`);
      }
    } else if (structureItem.structureType === "array") {
      if (structureItem.next.structureType === "message") {
        // When we have an array of messages, you probably want to filter on
        // some field, like `/topic.object{some_id=123}`. If we can't find a
        // typical filter name, fall back to `/topic.object[0]`.
        const typicalFilterName = Object.keys(structureItem.next.nextByName).find((key) => isTypicalFilterName(key));
        if (typicalFilterName) {
          // Find matching filter from clonedMessagePath
          const matchingFilterPart = clonedMessagePath.find(
            (pathPart) => pathPart.type === "filter" && pathPart.path[0] === typicalFilterName
          );

          // Remove the matching filter from clonedMessagePath, for future searches
          clonedMessagePath = clonedMessagePath.filter((pathPart) => pathPart !== matchingFilterPart);

          // Format the displayed filter value
          const filterVal =
            matchingFilterPart && matchingFilterPart.type === "filter" && matchingFilterPart.value
              ? matchingFilterPart.value
              : 0;
          traverse(
            structureItem.next,
            `${builtString}[:]{${typicalFilterName}==${
              typeof filterVal === "object" ? `$${filterVal.variableName}` : filterVal
            }}`
          );
        } else {
          traverse(structureItem.next, `${builtString}[0]`);
        }
      } else if (!noMultiSlices) {
        // When dealing with an array of primitives, you likely just want a
        // scatter plot (if we can do multi-slices).
        traverse(structureItem.next, `${builtString}[:]`);
      } else {
        traverse(structureItem.next, `${builtString}[0]`);
      }
    }
  }
  const structureItem = messagePathStructures(datatypes)[datatype];
  if (!structureItem) {
    throw new Error(`datatype not found "${datatype}"`);
  }
  traverse(structureItem, "");
  return messagePaths.sort(naturalSort());
}

export type StructureTraversalResult = {|
  valid: boolean,
  msgPathPart: ?MessagePathPart,
  structureItem: ?MessagePathStructureItem,
|};

// Traverse down the structure given a `messagePath`. Return if the path
// is valid, given the structure, `validTypes`, and `noMultiSlices`.
//
// We return the `msgPathPart` that was invalid to determine what sort
// of autocomplete we should show.
//
// We use memoizeWeak because it works with multiple arguments (lodash's memoize
// does not) and does not hold onto objects as strongly (it uses WeakMap).
export const traverseStructure = memoizeWeak(
  (structureItem: ?MessagePathStructureItem, messagePath: MessagePathPart[]): StructureTraversalResult => {
    if (!structureItem) {
      return { valid: false, msgPathPart: undefined, structureItem: undefined };
    }
    for (const msgPathPart: MessagePathPart of messagePath) {
      if (!structureItem) {
        return { valid: false, msgPathPart, structureItem };
      }
      if (structureItem.primitiveType === "json") {
        // No need to continue validating if we're dealing with JSON. We
        // essentially treat all nested values as valid.
        continue;
      } else if (msgPathPart.type === "name") {
        if (structureItem.structureType !== "message") {
          return { valid: false, msgPathPart, structureItem };
        }
        const next: ?MessagePathStructureItem = structureItem.nextByName[msgPathPart.name];
        const nextStructureIsJson = next && next.structureType === "primitive" && next?.primitiveType === "json";
        structureItem = !nextStructureIsJson
          ? next
          : {
              structureType: "primitive",
              primitiveType: "json",
              datatype: next ? next.datatype : "",
            };
      } else if (msgPathPart.type === "slice") {
        if (structureItem.structureType !== "array") {
          return { valid: false, msgPathPart, structureItem };
        }
        structureItem = structureItem.next;
      } else if (msgPathPart.type === "filter") {
        if (structureItem.structureType !== "message" || msgPathPart.path.length === 0 || msgPathPart.value == null) {
          return { valid: false, msgPathPart, structureItem };
        }
        let currentItem = structureItem;
        for (const name of msgPathPart.path) {
          if (currentItem.structureType !== "message") {
            return { valid: false, msgPathPart, structureItem };
          }
          currentItem = currentItem.nextByName[name];
          if (currentItem == null) {
            return { valid: false, msgPathPart, structureItem };
          }
        }
      } else {
        (msgPathPart.type: empty);
        throw new Error(`Invalid msgPathPart.type: ${msgPathPart.type}`);
      }
    }
    return { valid: true, msgPathPart: undefined, structureItem };
  }
);
