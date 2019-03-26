// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { groupBy, keyBy, sortBy } from "lodash";
import React from "react";
import styled from "styled-components";

import Flex from "webviz-core/src/components/Flex";
import { MessagePipelineConsumer, type MessagePipelineContext } from "webviz-core/src/components/MessagePipeline";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import type { SubscribePayload, AdvertisePayload, Topic } from "webviz-core/src/types/players";

const Container = styled.div`
  padding: 8px;
  overflow-y: auto;
  ul {
    font-size: 10px;
    margin-left: 8px;
  }
  li {
    margin: 4px 0;
  }
  h1 {
    font-size: 1.5em;
    margin-bottom: 0.5em;
  }
  section {
    flex: 1 1 50%;
    overflow: hidden;
  }
`;

function getSubscriptionGroup({ requester }: SubscribePayload): string {
  if (!requester) {
    return "<unknown>";
  }
  switch (requester.type) {
    case "panel":
      return `Panel “${requester.name}”`;
    case "node":
      return `Node “${requester.name}”`;
    case "other":
      return requester.name;
  }
  (requester.type: empty); // enforce that all cases are handled in switch above
  // this shouldn't be necessary, but Flow doesn't let us fall off the end without returning a string
  // https://github.com/facebook/flow/issues/451
  return `<unknown: ${requester.type} ${requester.name}>`;
}

function getPublisherGroup({ advertiser }: AdvertisePayload): string {
  if (!advertiser) {
    return "<unknown>";
  }
  switch (advertiser.type) {
    case "panel":
      return `Panel “${advertiser.name}”`;
  }
  (advertiser.type: empty);
  return `<unknown: ${advertiser.type} ${advertiser.name}>`;
}

// Display webviz internal state for debugging and for QA to view topic dependencies.
class Internals extends React.PureComponent<{}> {
  static panelType = "Internals";
  static defaultConfig = {};

  _renderSubscriptions(subscriptions: SubscribePayload[], topics: Topic[]) {
    if (subscriptions.length === 0) {
      return "(none)";
    }
    const groupedSubscriptions = groupBy(subscriptions, getSubscriptionGroup);
    const topicsByName = keyBy(topics, (topic) => topic.name);

    return Object.keys(groupedSubscriptions)
      .sort()
      .map((key) => {
        return (
          <React.Fragment key={key}>
            <p>{key}:</p>
            <ul>
              {sortBy(groupedSubscriptions[key], (sub) => sub.topic).map((sub, i) => (
                <li key={i}>
                  <tt>
                    {sub.topic}
                    {topicsByName[sub.topic] &&
                      topicsByName[sub.topic].originalTopic &&
                      ` (original topic: ${topicsByName[sub.topic].originalTopic})`}
                  </tt>
                </li>
              ))}
            </ul>
          </React.Fragment>
        );
      });
  }

  _renderPublishers(publishers: AdvertisePayload[]) {
    if (publishers.length === 0) {
      return "(none)";
    }
    const groupedSubscriptions = groupBy(publishers, getPublisherGroup);
    return Object.keys(groupedSubscriptions)
      .sort()
      .map((key) => {
        return (
          <React.Fragment key={key}>
            <p>{key}:</p>
            <ul>
              {sortBy(groupedSubscriptions[key], (sub) => sub.topic).map((sub, i) => (
                <li key={i}>
                  <tt>{sub.topic}</tt>
                </li>
              ))}
            </ul>
          </React.Fragment>
        );
      });
  }

  render() {
    return (
      <MessagePipelineConsumer>
        {(context: MessagePipelineContext) => (
          <Container>
            <PanelToolbar floating />
            <Flex row scroll>
              <section>
                <h1>Subscriptions</h1>
                {this._renderSubscriptions(context.subscriptions, context.sortedTopics)}
              </section>
              <section>
                <h1>Publishers</h1>
                {this._renderPublishers(context.publishers)}
              </section>
            </Flex>
          </Container>
        )}
      </MessagePipelineConsumer>
    );
  }
}

export default Panel<{}>(Internals);
