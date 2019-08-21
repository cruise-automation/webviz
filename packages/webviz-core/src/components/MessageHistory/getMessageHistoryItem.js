// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import {
  isTypicalFilterName,
  type MessageHistoryItem,
  type MessagePathStructureItem,
  type MessagePathStructureItemMessage,
} from ".";
import { type RosPath, type MessagePathFilter } from "./internalCommon";
import type { GlobalData } from "webviz-core/src/hooks/useGlobalData";
import { enumValuesByDatatypeAndField } from "webviz-core/src/selectors";
import type { Message, Topic } from "webviz-core/src/types/players";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";

function filterMatches(filter: MessagePathFilter, value: any, globalData: any) {
  let filterValue = filter.value;
  if (typeof filterValue === "object") {
    filterValue = globalData[filterValue.variableName];
  }

  let currentValue = value;
  for (const name of filter.path) {
    currentValue = currentValue[name];
    if (currentValue == null) {
      return false;
    }
  }

  // Test equality using `==` so we can be forgiving for comparing booleans with integers,
  // comparing numbers with strings, and so on.
  // eslint-disable-next-line eqeqeq
  return currentValue == filterValue;
}

// Get a new item that has `queriedData` set to the values and paths as queried by `rosPath`.
export default function getMessageHistoryItem(
  message: Message,
  rosPath: RosPath,
  topic: Topic,
  datatypes: RosDatatypes,
  globalData: GlobalData = {},
  structures: { [string]: MessagePathStructureItemMessage }
): ?MessageHistoryItem {
  // We don't care about messages that don't match the topic we're looking for.
  if (!topic || message.topic !== rosPath.topicName) {
    return undefined;
  }

  // Apply top-level filters first. If a message matches all top-level filters, then this function
  // will *always* return a history item, so this is our only chance to return nothing.
  for (const item of rosPath.messagePath) {
    if (item.type === "filter") {
      if (!filterMatches(item, message.message, globalData)) {
        return undefined;
      }
    } else {
      break;
    }
  }

  const queriedData = [];
  // Traverse the message (via `value`) and the `messagePath` at the same time. Also keep track
  // of a `path` string that we should show in the tooltip of the point.
  function traverse(value: any, pathIndex: number, path: string, structureItem: MessagePathStructureItem) {
    if (value === undefined || structureItem === undefined) {
      return;
    }
    const pathItem = rosPath.messagePath[pathIndex];
    const nextPathItem = rosPath.messagePath[pathIndex + 1];
    if (!pathItem) {
      // If we're at the end of the `messagePath`, we're done! Just store the point.
      let constantName: ?string;
      const prevPathItem = rosPath.messagePath[pathIndex - 1];
      if (prevPathItem && prevPathItem.type === "name") {
        const fieldName = prevPathItem.name;
        const enumMap = enumValuesByDatatypeAndField(datatypes)[structureItem.datatype];
        if (enumMap && enumMap[fieldName]) {
          constantName = enumMap[fieldName][value];
        }
      }
      queriedData.push({
        value,
        path,
        constantName,
      });
    } else if (pathItem.type === "name" && structureItem.structureType === "message") {
      // If the `pathItem` is a name, we're traversing down using that name.
      traverse(
        value[pathItem.name],
        pathIndex + 1,
        `${path}.${pathItem.name}`,
        structureItem.nextByName[pathItem.name]
      );
    } else if (pathItem.type === "slice" && structureItem.structureType === "array") {
      // If the `pathItem` is a slice, iterate over all the relevant elements in the array.
      for (let i = pathItem.start; i <= Math.min(pathItem.end, value.length - 1); i++) {
        if (value[i] === undefined) {
          continue;
        }
        // Ideally show something like `/topic.object[:]{some_id=123}` for the path, but fall
        // back to `/topic.object[10]` if necessary. In any case, make sure that the user can
        // actually identify where the value came from.
        let newPath;
        if (nextPathItem && nextPathItem.type === "filter") {
          // If we have a filter set after this, it will update the path appropriately.
          newPath = `${path}[:]`;
        } else {
          // See if `value[i]` has a property that we typically filter on. If so, show that.
          const name = Object.keys(value[i]).find((key) => isTypicalFilterName(key));
          if (name) {
            newPath = `${path}[:]{${name}==${value[i][name]}}`;
          } else {
            newPath = `${path}[${i}]`;
          }
        }
        traverse(value[i], pathIndex + 1, newPath, structureItem.next);
      }
    } else if (pathItem.type === "filter") {
      if (filterMatches(pathItem, value, globalData)) {
        traverse(value, pathIndex + 1, `${path}{${pathItem.repr}}`, structureItem);
      }
    } else {
      console.warn(`Unknown pathItem.type ${pathItem.type} for structureType: ${structureItem.structureType}`);
    }
  }
  traverse(message.message, 0, rosPath.topicName, structures[topic.datatype]);
  return { message, queriedData };
}
