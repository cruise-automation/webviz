// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { last } from "lodash";
import * as React from "react";
import { createSelector } from "reselect";
import type { Time } from "rosbag";

import addValuesWithPathsToItems from "./addValuesWithPathsToItems";
import { TOPICS_WITH_INCORRECT_HEADERS } from "./internalCommon";
import MessageHistoryInput from "./MessageHistoryInput";
import MessageHistoryOnlyTopics from "./MessageHistoryOnlyTopics";
import { messagePathStructures, traverseStructure } from "./messagePathsForDatatype";
import parseRosPath from "./parseRosPath";
import topicPathSyntaxHelpContent from "./topicPathSyntax.help.md";
import GlobalVariablesAccessor from "webviz-core/src/components/GlobalVariablesAccessor";
import { getFilteredFormattedTopics } from "webviz-core/src/components/MessageHistory/topicPrefixUtils";
import { MessagePipelineConsumer, type MessagePipelineContext } from "webviz-core/src/components/MessagePipeline";
import PanelContext from "webviz-core/src/components/PanelContext";
import { topicsByTopicName, shallowEqualSelector } from "webviz-core/src/selectors";
import type { Topic, Message } from "webviz-core/src/types/players";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";

// Use `<MessageHistory>` to get data from the player, typically a bag or ROS websocked bridge.
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
//  <MessageHistory.Input path={this.state.path} onChange={path => this.setState({ path })} />
//
// To limit the autocomplete items to only certain types of values, you can use
//
//  <MessageHistory.Input types={["message", "array", "primitives"]} />
//
// Or use actual ROS primitive types:
//
//  <MessageHistory.Input types={["uint16", "float64"]} />
//
// If you don't use timestamps, you might want to hide the warning icon that we show when selecting
// a topic that has no header: `<MessageHistory.Input hideTimestampWarning>`.
//
// If you are rendering many input fields, you might want to use `<MessageHistory.Input index={5}>`,
// which gets passed down to `<MessageHistory.Input onChange>` as the second parameter, so you can
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
  primitiveType: string,
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

type Props = {
  children: (MessageHistoryData) => React.Node,
  paths: string[],
  // Use an object to set a specific history size for specific topics.
  historySize?: number | { [topicName: string]: number },
  // For scaling down images, to spare bandwidth. When using this you should only
  // pass in image topics to `paths`.
  imageScale?: number,

  // By default message history will try to subscribe to topics
  // even if they don't existing in the player topic's list.
  // You can disable this behavior for typeahead scenarios or when
  // you expect user specified topics which are likely to not exist in the player
  // to prevent a lot of subscribing to non-existant topics.
  ignoreMissing?: boolean,

  // From player
  topics: Topic[],
  datatypes: RosDatatypes,
};

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

type ChildrenSelectorInput = {
  messagesByTopic: { [string]: Message[] },
  cleared: boolean,
  startTime: Time,
  paths: string[],
  topics: Topic[],
  datatypes: RosDatatypes,
  globalData: Object,
};

const getMemoizedChildrenInput = shallowEqualSelector(
  (input: ChildrenSelectorInput) => input,
  ({ messagesByTopic, cleared, startTime, paths, topics, datatypes, globalData }: ChildrenSelectorInput) => {
    const itemsByPath = {};
    const metadataByPath = {};
    const structures = messagePathStructures(datatypes);

    for (const path of paths) {
      itemsByPath[path] = [];
      metadataByPath[path] = undefined;

      const rosPath = parseRosPath(path);
      if (rosPath) {
        itemsByPath[path] = addValuesWithPathsToItems(
          messagesByTopic[rosPath.topicName],
          rosPath,
          topics,
          datatypes,
          globalData
        );

        const topic = topicsByTopicName(topics)[rosPath.topicName];
        if (topic) {
          const { structureItem } = traverseStructure(structures[topic.datatype], rosPath.messagePath);
          if (structureItem) {
            metadataByPath[path] = { structureItem };
          }
        }
      }
    }
    return { itemsByPath, cleared, metadataByPath, startTime };
  }
);

const getMemoizedTopics = createSelector(
  (input: string[]) => input,
  (paths: string[]) => {
    return paths
      .map(parseRosPath)
      .filter(Boolean)
      .map(({ topicName }) => topicName);
  }
);

// Be sure to pass in a new render function when you want to force a rerender.
// So you probably don't want to do `<MessageHistory>{this._renderSomething}</MessageHistory>`.
// This might be a bit counterintuitive but we do this since performance matters here.
class MessageHistory extends React.PureComponent<Props> {
  render() {
    const { children, paths, historySize, topics, datatypes, imageScale, ignoreMissing } = this.props;

    // Note: parseRosPath is memoized so we don't have to worry about calling it on
    // every render.
    return (
      <GlobalVariablesAccessor>
        {(globalData) => (
          <PanelContext.Consumer>
            {(panelData) => {
              const topicPrefix = (panelData || {}).topicPrefix || "";
              return (
                <MessageHistoryOnlyTopics
                  topicPrefix={topicPrefix}
                  panelType={(panelData || {}).type}
                  ignoreMissing={ignoreMissing}
                  topics={getMemoizedTopics(paths)}
                  historySize={historySize || Infinity}
                  imageScale={imageScale}
                  key={imageScale /* need to remount when imageScale changes */}>
                  {(data) =>
                    children(
                      getMemoizedChildrenInput({
                        ...data,
                        paths,
                        topics: getFilteredFormattedTopics(topics, topicPrefix),
                        datatypes,
                        globalData,
                      })
                    )
                  }
                </MessageHistoryOnlyTopics>
              );
            }}
          </PanelContext.Consumer>
        )}
      </GlobalVariablesAccessor>
    );
  }
}

export default function MessageHistoryConnected(props: any) {
  return (
    <MessagePipelineConsumer>
      {(context: MessagePipelineContext) => (
        <MessageHistory {...props} topics={context.sortedTopics} datatypes={context.datatypes} />
      )}
    </MessagePipelineConsumer>
  );
}

MessageHistoryConnected.Input = MessageHistoryInput;
MessageHistoryConnected.topicPathSyntaxHelpContent = topicPathSyntaxHelpContent;
