// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { last, keyBy } from "lodash";
import React, { type Node, useCallback, useMemo } from "react";
import type { Time } from "rosbag";

import getMessageHistoryItem from "./getMessageHistoryItem";
import { useShallowMemo } from "./hooks";
import { TOPICS_WITH_INCORRECT_HEADERS, type RosPrimitive, type RosPath } from "./internalCommon";
import MessageHistoryOnlyTopics from "./MessageHistoryOnlyTopics";
import { messagePathStructures, traverseStructure } from "./messagePathsForDatatype";
import parseRosPath from "./parseRosPath";
import filterMap from "webviz-core/src/filterMap";
import useGlobalVariables from "webviz-core/src/hooks/useGlobalVariables";
import * as PanelAPI from "webviz-core/src/PanelAPI";
import type { Message } from "webviz-core/src/players/types";

// Use `<MessageHistory>` to get data from the player, typically a bag or ROS websocket bridge.
// Typical usage looks like this:
//
// const path = "/some/topic.some.field";
//
// <MessageHistory paths={[path]}>
//   {({ itemsByPath }: MessageHistoryData) =>
//     <div>values: {itemsByPath[path].map(item => item.queriedData[0].value).join(',')}</div>
//   }
// </MessageHistory>
//
// There's various things you can do with paths:
// - Paths start with a topic name, like `/some/topic`, and then a message path, like `.some.field`.
// - You can also index into an array, like this: `/some/topic.many.values[0].x`
// - Slices are also allowed, and will output multiple entries to `item.queriedData`:
//   `/some/topic.many.values[1:3].x`, or even `/some/topic.many.values[:].x` to get all values.
// - Filter on particular values, usually in combination with slices:
//   `/some/topic.many.values[:]{id==123}.x` — for now only equality is supported.
//
// Items contain the following fields:
// - `queriedData`: values as queried by the `path`, along with actual `path` strings.
// - `message`: the original message.
//
// Furthermore, if you don't care about the full history, you can limit the history to some set
// number of items using `<MessageHistory historySize={10}>` (applied per path).
//
// To show an input field with an autocomplete so the user can enter paths themselves, use:
//
//  <MessageHistoryInput path={this.state.path} onChange={path => this.setState({ path })} />
//
// To limit the autocomplete items to only certain types of values, you can use
//
//  <MessageHistoryInput types={["message", "array", "primitives"]} />
//
// Or use actual ROS primitive types:
//
//  <MessageHistoryInput types={["uint16", "float64"]} />
//
// If you don't use timestamps, you might want to hide the warning icon that we show when selecting
// a topic that has no header: `<MessageHistoryInput hideTimestampWarning>`.
//
// If you are rendering many input fields, you might want to use `<MessageHistoryInput index={5}>`,
// which gets passed down to `<MessageHistoryInput onChange>` as the second parameter, so you can
// avoid creating anonymous functions on every render (which will prevent the component from
// rendering unnecessarily).

export type MessageHistoryTimestampMethod = "receiveTime" | "headerStamp";

export type MessageHistoryQueriedDatum = {|
  value: mixed, // The actual value.
  // TODO(JP): Maybe this should just be a simple path without nice ids, and then have a separate function
  // to generate "nice ids". Because they might not always be reliable and we might want to use different
  // kinds of "nice ids" for different purposes, e.g. `[10]{id==5}{other_id=123}` for tooltips (more information)
  // but `[:]{other_id==123}` for line graphs (more likely to match values).
  path: string, // The path to get to this value. Tries to use "nice ids" like `[:]{some_id==123}` wherever possible.
  constantName: ?string, // The name of the constant that the value matches up with, if any.
|};

export type MessageHistoryItem = {
  queriedData: MessageHistoryQueriedDatum[],
  message: Message,
};

export type MessageHistoryItemsByPath = { [string]: MessageHistoryItem[] };

// "Structure items" are a more useful version of `datatypes`. They can be
// easily traversed to either validate message paths or generate message paths.
export type MessagePathStructureItemMessage = {|
  structureType: "message",
  nextByName: { [string]: MessagePathStructureItem }, // eslint-disable-line no-use-before-define
  datatype: string,
|};
type MessagePathStructureItemArray = {|
  structureType: "array",
  next: MessagePathStructureItem, // eslint-disable-line no-use-before-define
  datatype: string,
|};
type MessagePathStructureItemPrimitive = {|
  structureType: "primitive",
  primitiveType: RosPrimitive,
  datatype: string,
|};
export type MessagePathStructureItem =
  | MessagePathStructureItemMessage
  | MessagePathStructureItemArray
  | MessagePathStructureItemPrimitive;

export type MessageHistoryMetadata = {| structureItem: MessagePathStructureItem |};

export type MessageHistoryData = {|
  itemsByPath: MessageHistoryItemsByPath,
  cleared: boolean,
  metadataByPath: { [string]: MessageHistoryMetadata },
  startTime: Time,
|};

type Props = {|
  children: (MessageHistoryData) => Node,
  paths: string[],
  // Use an object to set a specific history size for specific topics.
  historySize?: number | { [topicName: string]: number },
  // For scaling down images, to spare bandwidth. When using this you should only
  // pass in image topics to `paths`.
  imageScale?: number,
|};

export function getLastItem(frame: MessageHistoryItem[]): Message | typeof undefined {
  const lastItem = last(frame);
  return lastItem && lastItem.message ? lastItem.message : undefined;
}

// If a field is a typical filter name we'll suggest using it as a filter plus
// slice, like so: `something[:]{some_id==0}`.
export function isTypicalFilterName(name: string) {
  return /^id$|_id$|I[dD]$/.test(name);
}

export function getTimestampForMessage(message: Message, timestampMethod?: MessageHistoryTimestampMethod): Time | null {
  if (timestampMethod === "headerStamp") {
    if (
      message.message.header &&
      message.message.header.stamp &&
      (message.message.header.stamp.sec || message.message.header.stamp.nsec) &&
      !TOPICS_WITH_INCORRECT_HEADERS.includes(message.topic)
    ) {
      return message.message.header.stamp;
    }
    return null;
  }
  return message.receiveTime;
}

// Be sure to pass in a new render function when you want to force a rerender.
// So you probably don't want to do `<MessageHistory>{this._renderSomething}</MessageHistory>`.
// This might be a bit counterintuitive but we do this since performance matters here.
export default React.memo<Props>(function MessageHistory({ children, paths, historySize, imageScale }: Props) {
  const { globalVariables } = useGlobalVariables();
  const { datatypes, topics: sortedTopics } = PanelAPI.useDataSourceInfo();

  const memoizedTopicsByName = useMemo(() => keyBy(sortedTopics, ({ name }) => name), [sortedTopics]);

  const structures = messagePathStructures(datatypes);

  const memoizedPaths = useShallowMemo(paths);
  const [rosPaths, metadataByPath, pathsByTopic, topics] = useMemo(
    () => {
      const innerRosPaths: { [string]: ?RosPath } = {};
      const innerMetadataByPath: { [string]: MessageHistoryMetadata } = {};
      const innerPathsByTopic: { [string]: { path: string, rosPath: RosPath }[] } = {};

      for (const path of new Set(memoizedPaths)) {
        const rosPath = parseRosPath(path);
        innerRosPaths[path] = rosPath;
        if (rosPath) {
          innerPathsByTopic[rosPath.topicName] = innerPathsByTopic[rosPath.topicName] || [];
          innerPathsByTopic[rosPath.topicName].push({ path, rosPath });

          const topic = memoizedTopicsByName[rosPath.topicName];
          if (topic) {
            const { structureItem } = traverseStructure(structures[topic.datatype], rosPath.messagePath);
            if (structureItem) {
              innerMetadataByPath[path] = { structureItem };
            }
          }
        }
      }
      return [innerRosPaths, innerMetadataByPath, innerPathsByTopic, Object.keys(innerPathsByTopic)];
    },
    [memoizedPaths, memoizedTopicsByName, structures]
  );

  const memoizedHistorySize = useShallowMemo(historySize);

  // Add a message to all the applicable entries in itemsByPath based on its topic.
  const addMessage: (MessageHistoryItemsByPath, Message) => MessageHistoryItemsByPath = useCallback(
    (itemsByPath: MessageHistoryItemsByPath, message: Message) => {
      const historyLen =
        memoizedHistorySize && typeof memoizedHistorySize === "object"
          ? memoizedHistorySize[message.topic]
          : memoizedHistorySize;

      const pathsMatchingMessage = pathsByTopic[message.topic];
      if (!pathsMatchingMessage || pathsMatchingMessage.length === 0) {
        return itemsByPath;
      }

      let newItemsByPath;
      for (const { path, rosPath } of pathsMatchingMessage) {
        const topic = memoizedTopicsByName[rosPath.topicName];
        if (!topic) {
          throw new Error(`Missing topic (${rosPath.topicName}) for received message; this should never happen`);
        }
        const item = getMessageHistoryItem(message, rosPath, topic, datatypes, globalVariables, structures);
        if (!item) {
          continue;
        }

        if (!newItemsByPath) {
          newItemsByPath = { ...itemsByPath };
        }
        const newItems = newItemsByPath[path].concat(item);
        if (historyLen != null && Number.isFinite(historyLen) && newItems.length > historyLen) {
          newItems.splice(0, newItems.length - historyLen);
        }
        newItemsByPath[path] = newItems;
      }
      return newItemsByPath || itemsByPath;
    },
    [datatypes, memoizedTopicsByName, globalVariables, memoizedHistorySize, pathsByTopic, structures]
  );

  // Create itemsByPath, using prevItemsByPath if items were present for the same topics.
  const restore = useCallback(
    (prevItemsByPath: ?MessageHistoryItemsByPath): MessageHistoryItemsByPath => {
      // Group the previous messages by their topic so we can restore them into new paths for the same topic.
      const messagesByTopic: { [topic: string]: Message[] } = {};
      if (prevItemsByPath) {
        for (const path in prevItemsByPath) {
          const rosPath = parseRosPath(path);
          if (rosPath) {
            // TODO: Keeping only messages from the first path which matches this topic isn't optimal --
            // some other messages on the same topic might have been available under a different path.
            // If we cared a lot we could actually merge them from all paths, but this is a good start.
            if (!messagesByTopic[rosPath.topicName]) {
              messagesByTopic[rosPath.topicName] = prevItemsByPath[path].map((item) => item.message);
            }
          }
        }
      }

      const itemsByPath: MessageHistoryItemsByPath = {};
      for (const path of memoizedPaths) {
        // If we're just generating initial state, start with an empty array for each path.
        if (!prevItemsByPath) {
          itemsByPath[path] = [];
          continue;
        }

        const rosPath = rosPaths[path];
        const { topicName } = rosPath || {};
        // If we didn't have any messages on this topic (or if the path isn't valid), we can't restore any items.
        if (!rosPath || !messagesByTopic[topicName]) {
          itemsByPath[path] = [];
          continue;
        }
        const topic = memoizedTopicsByName[topicName];
        if (!topic) {
          itemsByPath[path] = [];
          continue;
        }

        // If this path already existed, try to restore the previous items.
        // (Note that the paths may refer to global variables, so we can't just directly
        // copy the items over; we must run them through getMessageHistoryItem again.)
        if (prevItemsByPath[path]) {
          itemsByPath[path] = filterMap(prevItemsByPath[path], ({ message }) =>
            getMessageHistoryItem(message, rosPath, topic, datatypes, globalVariables, structures)
          );
          continue;
        }

        // Extract items for this new path from the original messages.
        itemsByPath[path] = filterMap(messagesByTopic[topicName], (message) =>
          getMessageHistoryItem(message, rosPath, topic, datatypes, globalVariables, structures)
        );
      }

      return itemsByPath;
    },
    [datatypes, memoizedTopicsByName, globalVariables, memoizedPaths, rosPaths, structures]
  );

  const renderChildren = useCallback(
    ({ reducedValue: itemsByPath, cleared, startTime }) => {
      return children({ itemsByPath, cleared, metadataByPath, startTime });
    },
    [children, metadataByPath]
  );

  return (
    <MessageHistoryOnlyTopics
      topics={imageScale == null ? topics : topics.map((topic) => ({ topic, imageScale }))}
      restore={restore}
      addMessage={addMessage}
      key={imageScale /* need to remount when imageScale changes */}>
      {renderChildren}
    </MessageHistoryOnlyTopics>
  );
});

export { default as MessageHistoryInput } from "./MessageHistoryInput";
