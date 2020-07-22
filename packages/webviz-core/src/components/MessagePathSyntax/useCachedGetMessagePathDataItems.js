// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { isEqual } from "lodash";
import { useCallback, useMemo, useRef } from "react";

import { type MessagePathFilter } from "./constants";
import { messagePathStructures } from "./messagePathsForDatatype";
import type { MessagePathStructureItem, RosPath } from "webviz-core/src/components/MessagePathSyntax/constants";
import { isTypicalFilterName } from "webviz-core/src/components/MessagePathSyntax/isTypicalFilterName";
import parseRosPath from "webviz-core/src/components/MessagePathSyntax/parseRosPath";
import useGlobalVariables, { type GlobalVariables } from "webviz-core/src/hooks/useGlobalVariables";
import * as PanelAPI from "webviz-core/src/PanelAPI";
import type { ReflectiveMessage, RosValue, Topic } from "webviz-core/src/players/types";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";
import { useChangeDetector, useDeepMemo, useShallowMemo } from "webviz-core/src/util/hooks";
import { enumValuesByDatatypeAndField, getTopicsByTopicName } from "webviz-core/src/util/selectors";

export type MessagePathDataItem = {|
  value: RosValue, // The actual value.
  // TODO(JP): Maybe this should just be a simple path without nice ids, and then have a separate function
  // to generate "nice ids". Because they might not always be reliable and we might want to use different
  // kinds of "nice ids" for different purposes, e.g. `[10]{id==5}{other_id=123}` for tooltips (more information)
  // but `[:]{other_id==123}` for line graphs (more likely to match values).
  path: string, // The path to get to this value. Tries to use "nice ids" like `[:]{some_id==123}` wherever possible.
  constantName?: ?string, // The name of the constant that the value matches up with, if any.
|};

// Given a set of message paths, this returns a function that you can call to resolve a single path
// and message to an array of `MessagePathDataItem` objects. The array+objects will be the same by
// reference, as long as topics/datatypes/global variables haven't changed in the meantime.
export function useCachedGetMessagePathDataItems(
  paths: string[]
): (path: string, message: ReflectiveMessage) => ?(MessagePathDataItem[]) {
  const { topics: providerTopics, datatypes } = PanelAPI.useDataSourceInfo();
  const { globalVariables } = useGlobalVariables();
  const memoizedPaths: string[] = useShallowMemo<string[]>(paths);

  // We first fill in global variables in the paths, so we can later see which paths have really
  // changed when the global variables have changed.
  const unmemoizedFilledInPaths: { [string]: RosPath } = useMemo(
    () => {
      const filledInPaths = {};
      for (const path of memoizedPaths) {
        const rosPath = parseRosPath(path);
        if (rosPath) {
          filledInPaths[path] = fillInGlobalVariablesInPath(rosPath, globalVariables);
        }
      }
      return filledInPaths;
    },
    [globalVariables, memoizedPaths]
  );
  const memoizedFilledInPaths = useDeepMemo<{ [string]: RosPath }>(unmemoizedFilledInPaths);

  // Cache MessagePathDataItem arrays by Message. We need to clear out this cache whenever
  // the topics or datatypes change, since that's what getMessagePathDataItems
  // depends on, outside of the message+path.
  const cachesByPath = useRef<{
    [string]: {| filledInPath: RosPath, weakMap: WeakMap<ReflectiveMessage, ?(MessagePathDataItem[])> |},
  }>({});
  if (useChangeDetector([providerTopics, datatypes], true)) {
    cachesByPath.current = {};
  }
  // When the filled in paths changed, then that means that either the path string changed, or a
  // relevant global variable changed. Delete the caches for where the `filledInPath` doesn't match
  // any more.
  if (useChangeDetector([memoizedFilledInPaths], false)) {
    for (const path of Object.keys(cachesByPath.current)) {
      const filledInPath = memoizedFilledInPaths[path];
      if (!filledInPath || !isEqual(cachesByPath.current[path].filledInPath, filledInPath)) {
        delete cachesByPath.current[path];
      }
    }
  }

  return useCallback(
    (path: string, message: ReflectiveMessage): ?(MessagePathDataItem[]) => {
      if (!memoizedPaths.includes(path)) {
        throw new Error(`path (${path}) was not in the list of cached paths`);
      }
      const filledInPath = memoizedFilledInPaths[path];
      if (!filledInPath) {
        return;
      }
      if (!cachesByPath.current[path]) {
        cachesByPath.current[path] = { filledInPath, weakMap: new WeakMap() };
      }
      const { weakMap } = cachesByPath.current[path];
      if (!weakMap.has(message)) {
        const messagePathDataItems = getMessagePathDataItems(message, filledInPath, providerTopics, datatypes);
        weakMap.set(message, messagePathDataItems);
        return messagePathDataItems;
      }
      const messagePathDataItems = weakMap.get(message);
      return messagePathDataItems;
    },
    [datatypes, memoizedFilledInPaths, memoizedPaths, providerTopics]
  );
}

function filterMatches(filter: MessagePathFilter, value: any) {
  if (typeof filter.value === "object") {
    throw new Error("filterMatches only works on paths where global variables have been filled in");
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
  return currentValue == filter.value;
}

export function fillInGlobalVariablesInPath(rosPath: RosPath, globalVariables: GlobalVariables): RosPath {
  return {
    ...rosPath,
    messagePath: rosPath.messagePath.map((messagePathPart) => {
      if (messagePathPart.type === "slice") {
        const start =
          typeof messagePathPart.start === "object"
            ? Number(globalVariables[messagePathPart.start.variableName])
            : messagePathPart.start;
        const end =
          typeof messagePathPart.end === "object"
            ? Number(globalVariables[messagePathPart.end.variableName])
            : messagePathPart.end;

        return {
          ...messagePathPart,
          start: isNaN(start) ? 0 : start,
          end: isNaN(end) ? Infinity : end,
        };
      } else if (messagePathPart.type === "filter" && typeof messagePathPart.value === "object") {
        let value;
        const variable = globalVariables[messagePathPart.value.variableName];
        if (typeof variable === "number" || typeof variable === "string") {
          value = variable;
        }
        return { ...messagePathPart, value };
      }

      (messagePathPart.type: "name" | "filter");
      return messagePathPart;
    }),
  };
}

const TIME_NEXT_BY_NAME = Object.freeze({
  sec: { structureType: "primitive", primitiveType: "int32", datatype: "time" },
  nsec: { structureType: "primitive", primitiveType: "int32", datatype: "time" },
});

// Get a new item that has `queriedData` set to the values and paths as queried by `rosPath`.
// Exported just for tests.
export function getMessagePathDataItems(
  message: ReflectiveMessage,
  filledInPath: RosPath,
  providerTopics: $ReadOnlyArray<Topic>,
  datatypes: RosDatatypes
): ?(MessagePathDataItem[]) {
  const structures = messagePathStructures(datatypes);
  const topic = getTopicsByTopicName(providerTopics)[filledInPath.topicName];

  // We don't care about messages that don't match the topic we're looking for.
  if (!topic || message.topic !== filledInPath.topicName) {
    return;
  }

  // Apply top-level filters first. If a message matches all top-level filters, then this function
  // will *always* return a history item, so this is our only chance to return nothing.
  for (const item of filledInPath.messagePath) {
    if (item.type === "filter") {
      if (!filterMatches(item, message.message)) {
        return [];
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
    const pathItem = filledInPath.messagePath[pathIndex];
    const nextPathItem = filledInPath.messagePath[pathIndex + 1];
    const structureIsJson = structureItem.structureType === "primitive" && structureItem.primitiveType === "json";
    if (!pathItem) {
      // If we're at the end of the `messagePath`, we're done! Just store the point.
      let constantName: ?string;
      const prevPathItem = filledInPath.messagePath[pathIndex - 1];
      if (prevPathItem && prevPathItem.type === "name") {
        const fieldName = prevPathItem.name;
        const enumMap = enumValuesByDatatypeAndField(datatypes)[structureItem.datatype];
        if (enumMap && enumMap[fieldName]) {
          constantName = enumMap[fieldName][value];
        }
      }
      queriedData.push({ value, path, constantName });
    } else if (pathItem.type === "name" && structureItem.structureType === "message") {
      // If the `pathItem` is a name, we're traversing down using that name.
      const next = structureItem.nextByName[pathItem.name];
      const nextStructIsJson = next && next.structureType === "primitive" && next?.primitiveType === "json";
      traverse(
        value[pathItem.name],
        pathIndex + 1,
        `${path}.${pathItem.name}`,
        !nextStructIsJson ? next : { structureType: "primitive", primitiveType: "json", datatype: "" }
      );
    } else if (
      pathItem.type === "name" &&
      (structureItem.primitiveType === "time" || structureItem.primitiveType === "duration")
    ) {
      traverse(value[pathItem.name], pathIndex + 1, `${path}.${pathItem.name}`, TIME_NEXT_BY_NAME[pathItem.name]);
    } else if (pathItem.type === "slice" && (structureItem.structureType === "array" || structureIsJson)) {
      const { start, end } = pathItem;
      if (typeof start === "object" || typeof end === "object") {
        throw new Error("getMessagePathDataItems  only works on paths where global variables have been filled in");
      }
      const startIdx: number = start;
      const endIdx: number = end;
      if (typeof startIdx !== "number" || typeof endIdx !== "number") {
        return;
      }

      // If the `pathItem` is a slice, iterate over all the relevant elements in the array.
      for (let i = startIdx; i <= Math.min(endIdx, value.length - 1); i++) {
        const index = i >= 0 ? i : value.length + i;
        if (value[index] === undefined) {
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
          // See if `value[index]` has a property that we typically filter on. If so, show that.
          const name = Object.keys(value[index]).find((key) => isTypicalFilterName(key));
          if (name) {
            newPath = `${path}[:]{${name}==${value[index][name]}}`;
          } else {
            // Use `i` here instead of `index`, since it's only different when `i` is negative,
            // and in that case it's probably more useful to show to the user how many elements
            // from the end of the array this data is, since they clearly are thinking in that way
            // (otherwise they wouldn't have chosen a negative slice).
            newPath = `${path}[${i}]`;
          }
        }
        traverse(
          value[index],
          pathIndex + 1,
          newPath,
          !structureIsJson && structureItem.structureType === "array" ? structureItem.next : structureItem // Structure is already JSON.
        );
      }
    } else if (pathItem.type === "filter") {
      if (filterMatches(pathItem, value)) {
        traverse(value, pathIndex + 1, `${path}{${pathItem.repr}}`, structureItem);
      }
    } else if (structureIsJson && pathItem.name) {
      traverse(value[pathItem.name], pathIndex + 1, `${path}.${pathItem.name}`, {
        structureType: "primitive",
        primitiveType: "json",
        datatype: "",
      });
    } else {
      console.warn(`Unknown pathItem.type ${pathItem.type} for structureType: ${structureItem.structureType}`);
    }
  }
  traverse(message.message, 0, filledInPath.topicName, structures[topic.datatype]);
  return queriedData;
}

export const useDecodeMessagePathsForMessagesByTopic = (paths: string[]) => {
  const memoizedPaths = useShallowMemo<string[]>(paths);
  const cachedGetMessagePathDataItems = useCachedGetMessagePathDataItems(memoizedPaths);
  // Note: Let callers define their own memoization scheme for messagesByTopic. For regular playback
  // useMemo might be appropriate, but weakMemo will likely better for blocks.
  return useCallback(
    (messagesByTopic: $ReadOnly<{ [topicName: string]: $ReadOnlyArray<ReflectiveMessage> }>) => {
      const obj = {};
      for (const path of memoizedPaths) {
        // Create an array for invalid paths, and valid paths with entries in messagesByTopic
        const rosPath = parseRosPath(path);
        if (!rosPath) {
          obj[path] = [];
          continue;
        }
        if (!messagesByTopic[rosPath.topicName]) {
          // For the playback pipeline messagesByTopic will always include an entry for every topic.
          // For the blocks, missing entries are semantically interesting, and should result in
          // missing (not empty) entries in the output so that information is communicated
          // downstream.
          continue;
        }
        obj[path] = [];

        for (const message of messagesByTopic[rosPath.topicName]) {
          // Add the item (if it exists) to the array.
          const queriedData = cachedGetMessagePathDataItems(path, message);
          if (queriedData) {
            obj[path].push({ message, queriedData });
          }
        }
      }
      return obj;
    },
    [memoizedPaths, cachedGetMessagePathDataItems]
  );
};
