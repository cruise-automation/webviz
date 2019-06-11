// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { isTypicalFilterName, type MessageHistoryItem, type MessagePathStructureItem } from ".";
import { type RosPath } from "./internalCommon";
import { messagePathStructures } from "webviz-core/src/components/MessageHistory/messagePathsForDatatype";
import { enumValuesByDatatypeAndField, topicsByTopicName } from "webviz-core/src/selectors";
import type { Message, Topic } from "webviz-core/src/types/players";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";

// Get a new set of `items` that has `queriedData` set to the values and paths as
// query by `rosPath`.
export default function addValuesWithPathsToItems(
  messages: Message[],
  rosPath: RosPath,
  topics: Topic[],
  datatypes: RosDatatypes,
  globalData: Object = {}
): MessageHistoryItem[] {
  const structures = messagePathStructures(datatypes);

  // Iterate over the individual messages.
  return messages
    .map((message: Message) => {
      const topic = topicsByTopicName(topics)[rosPath.topicName];
      // We don't care about messages that don't match the topic we're looking for.
      if (!topic || message.topic !== rosPath.topicName) {
        return undefined;
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
            let typicalFilterName;
            if (nextPathItem && nextPathItem.type === "filter" && value[i][nextPathItem.name] !== undefined) {
              // If we have a filter set after this, use the name that we're actually
              // filtering on.
              typicalFilterName = nextPathItem.name;
            } else {
              // See if `value[i]` has a property that we typically filter on. If so, show that.
              const name = Object.keys(value[i]).find((key) => isTypicalFilterName(key));
              if (name) {
                typicalFilterName = name;
              }
            }
            traverse(
              value[i],
              pathIndex + 1,
              typicalFilterName ? `${path}[:]{${typicalFilterName}==${value[i][typicalFilterName]}}` : `${path}[${i}]`,
              structureItem.next
            );
          }
        } else if (pathItem.type === "filter") {
          let filterValue = pathItem.value;
          if (typeof filterValue === "object") {
            filterValue = globalData[filterValue.variableName];
          }
          // If the `pathItem` is a filter, then we might not traverse any further. Test equality
          // using `==` so we can be forgiving for comparing booleans with integers, comparing numbers
          // with strings, and so on.
          // eslint-disable-next-line eqeqeq
          if (value[pathItem.name] == filterValue) {
            traverse(value, pathIndex + 1, path, structureItem);
          }
        } else {
          console.warn(`Unknown pathItem.type ${pathItem.type} for structureType: ${structureItem.structureType}`);
        }
      }
      traverse(message.message, 0, rosPath.topicName, structures[topic.datatype]);
      return { message, queriedData };
    })
    .filter(Boolean);
}
