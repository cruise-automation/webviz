// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { last } from "lodash";
import memoizeWeak from "memoize-weak";

import { type MessagePathStructureItem } from "webviz-core/src/components/MessagePathSyntax/constants";
import { isTypicalFilterName } from "webviz-core/src/components/MessagePathSyntax/isTypicalFilterName";

export type ValueAction =
  | {|
      type: "pivot",
      pivotPath: string, // Path to filter on using the current value, if the current value is an id.
    |}
  | {|
      type: "primitive",
      singleSlicePath: string, // Path that will only return one value per unit of time (for line charts).
      multiSlicePath: string, // Path that might return multiple values per unit of time (for scatter plots).
      primitiveType: string, // The ROS primitive type that these paths point at.
    |};

// Given a root value (e.g. a message object), a root structureItem (e.g. a message definition),
// and a key path to navigate down the value and strutureItem (e.g. ["items", 10, "speed"]), return
// a bunch of paths for that navigated down value.
export function getValueActionForValue(
  rootValue: mixed,
  rootStructureItem: ?MessagePathStructureItem,
  keyPath: (number | string)[]
): ?ValueAction {
  let singleSlicePath = "";
  let multiSlicePath = "";
  let pivotPath = "";
  let value: mixed = rootValue;
  let structureItem: ?MessagePathStructureItem = rootStructureItem;
  // Walk down the keyPath, while updating `value` and `structureItem`
  for (const pathItem: number | string of keyPath) {
    if (structureItem == null || value == null) {
      break;
    } else if (structureItem.structureType === "message" && typeof value === "object" && typeof pathItem === "string") {
      structureItem =
        structureItem.datatype === "json"
          ? { structureType: "primitive", primitiveType: "json", datatype: "" }
          : structureItem.nextByName[pathItem];
      value = value[pathItem];
      if (multiSlicePath.endsWith("[:]")) {
        // We're just inside a message that is inside an array, so we might want to pivot on this new value.
        pivotPath = `${multiSlicePath}{${pathItem}==${JSON.stringify(value) || ""}}`;
      } else {
        pivotPath = "";
      }
      singleSlicePath += `.${pathItem}`;
      multiSlicePath += `.${pathItem}`;
    } else if (structureItem.structureType === "array" && Array.isArray(value) && typeof pathItem === "number") {
      value = value[pathItem];
      structureItem = structureItem.next;
      if (!structureItem) {
        break;
      }
      multiSlicePath = `${singleSlicePath}[:]`;
      // Ideally show something like `/topic.object[:]{id=123}` for the singleSlicePath, but fall
      // back to `/topic.object[10]` if necessary.
      let typicalFilterName;
      if (structureItem.structureType === "message") {
        typicalFilterName = Object.keys(structureItem.nextByName).find((key) => isTypicalFilterName(key));
      }
      if (typeof value === "object" && value != null && typeof typicalFilterName === "string") {
        singleSlicePath += `[:]{${typicalFilterName}==${JSON.stringify(value[typicalFilterName]) || ""}}`;
      } else {
        singleSlicePath += `[${pathItem}]`;
      }
    } else if (structureItem.structureType === "primitive") {
      // ROS has some primitives that contain nested data (time+duration). We currently don't
      // support looking inside them.
      return;
    } else {
      throw new Error(`Invalid structureType: ${structureItem.structureType} for value/pathItem.`);
    }
  }
  // At this point we should be looking at a primitive. If not, just return nothing.
  if (structureItem && structureItem.structureType === "primitive" && value != null) {
    if (pivotPath && isTypicalFilterName(last(keyPath).toString())) {
      return { type: "pivot", pivotPath };
    }
    return {
      type: "primitive",
      singleSlicePath,
      multiSlicePath,
      primitiveType: structureItem.primitiveType,
    };
  }
}

// Given root structureItem (e.g. a message definition),
// and a key path (comma-joined) to navigate down, return strutureItem for the field at that path
// Using comma-joined path to allow memoization of this function
export const getStructureItemForPath = memoizeWeak(
  (rootStructureItem: ?MessagePathStructureItem, keyPathJoined: string): ?MessagePathStructureItem => {
    // split the path and parse into numbers and strings
    const keyPath: (number | string)[] = [];
    for (const part: string of keyPathJoined.split(",")) {
      if (!isNaN(part)) {
        keyPath.push(parseInt(part));
      } else {
        keyPath.push(part);
      }
    }
    let structureItem: ?MessagePathStructureItem = rootStructureItem;
    // Walk down the keyPath, while updating `value` and `structureItem`
    for (const pathItem: number | string of keyPath) {
      if (structureItem == null) {
        break;
      } else if (structureItem.structureType === "message" && typeof pathItem === "string") {
        structureItem = structureItem.nextByName[pathItem];
      } else if (structureItem.structureType === "array" && typeof pathItem === "number") {
        structureItem = structureItem.next;
        if (!structureItem) {
          break;
        }
      } else if (structureItem.structureType === "primitive") {
        // ROS has some primitives that contain nested data (time+duration). We currently don't
        // support looking inside them.
        return structureItem;
      } else {
        throw new Error(`Invalid structureType: ${structureItem.structureType} for value/pathItem.`);
      }
    }
    return structureItem;
  }
);
