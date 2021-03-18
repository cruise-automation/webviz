// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { groupBy, sortBy, mapValues } from "lodash";
import * as React from "react";
import { hot } from "react-hot-loader/root";
import styled from "styled-components";

import Button from "webviz-core/src/components/Button";
import Dropdown from "webviz-core/src/components/Dropdown";
import Flex from "webviz-core/src/components/Flex";
import { Item } from "webviz-core/src/components/Menu";
import MessageHistoryDEPRECATED from "webviz-core/src/components/MessageHistoryDEPRECATED";
import { useMessagePipeline } from "webviz-core/src/components/MessagePipeline";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import TextContent from "webviz-core/src/components/TextContent";
import filterMap from "webviz-core/src/filterMap";
import * as PanelAPI from "webviz-core/src/PanelAPI";
import type { Topic, Message, SubscribePayload, AdvertisePayload } from "webviz-core/src/players/types";
import { downloadTextFile } from "webviz-core/src/util";
import { getTopicsByTopicName } from "webviz-core/src/util/selectors";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

const { useCallback } = React;

const RECORD_ALL = "RECORD_ALL";

const Container = styled.div`
  padding: 16px;
  overflow-y: auto;
  ul {
    font-size: 10px;
    margin-left: 8px;
  }
  li {
    margin: 4px 0;
  }
  // Taken shamelessly from https://stackoverflow.com/a/14424029.
  li div {
    padding-left: 1em;
    position: relative;
  }
  li div::before {
    content: "";
    position: absolute;
    top: 0;
    left: -2px;
    bottom: 50%;
    width: 0.75em;
    border: 2px solid ${colors.TEXT_MUTED};
    border-top: 0 none transparent;
    border-right: 0 none transparent;
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

// Display webviz internal state for debugging and viewing topic dependencies.
function Internals(): React.Node {
  const { topics } = PanelAPI.useDataSourceInfo();
  const topicsByName = React.useMemo(() => getTopicsByTopicName(topics), [topics]);
  const { subscriptions, publishers } = useMessagePipeline(
    useCallback(
      (messagePipeline) => ({ subscriptions: messagePipeline.subscriptions, publishers: messagePipeline.publishers }),
      []
    )
  );

  const [groupedSubscriptions, subscriptionGroups] = React.useMemo(() => {
    const grouped = groupBy(subscriptions, getSubscriptionGroup);
    return [grouped, Object.keys(grouped)];
  }, [subscriptions]);

  const renderedSubscriptions = React.useMemo(() => {
    if (subscriptions.length === 0) {
      return "(none)";
    }
    return Object.keys(groupedSubscriptions)
      .sort()
      .map((key) => {
        return (
          <React.Fragment key={key}>
            <div style={{ marginTop: 16 }}>{key}:</div>
            <ul>
              {sortBy(groupedSubscriptions[key], (sub) => sub.topic).map((sub, i) => (
                <li key={i}>
                  <tt>
                    {sub.topic}
                    {topicsByName[sub.topic] &&
                      topicsByName[sub.topic].originalTopic &&
                      ` (original topic: ${topicsByName[sub.topic].originalTopic})`}
                  </tt>
                  <ul>
                    {((topicsByName[sub.topic] && topicsByName[sub.topic].inputTopics) ?? []).map((inputTopic) => (
                      <li key={`${i}-${inputTopic}`}>
                        <div>{inputTopic}</div>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </React.Fragment>
        );
      });
  }, [groupedSubscriptions, subscriptions.length, topicsByName]);

  const renderedPublishers = React.useMemo(() => {
    if (publishers.length === 0) {
      return "(none)";
    }
    const groupedPublishers = groupBy(publishers, getPublisherGroup);
    return Object.keys(groupedPublishers)
      .sort()
      .map((key) => {
        return (
          <React.Fragment key={key}>
            <div style={{ marginTop: 16 }}>{key}:</div>
            <ul>
              {sortBy(groupedPublishers[key], (sub) => sub.topic).map((sub, i) => (
                <li key={i}>
                  <tt>{sub.topic}</tt>
                </li>
              ))}
            </ul>
          </React.Fragment>
        );
      });
  }, [publishers]);

  const [recordGroup, setRecordGroup] = React.useState<string>(RECORD_ALL);
  const [recordingTopics, setRecordingTopics] = React.useState<?(string[])>();
  const recordedData = React.useRef<?{ topics: Topic[], frame: { [string]: Message[] } }>();

  function onRecordClick() {
    if (recordingTopics) {
      recordedData.current = undefined;
      setRecordingTopics(undefined);
      return;
    }
    const recordSubs = recordGroup === RECORD_ALL ? subscriptions : groupedSubscriptions[recordGroup];
    setRecordingTopics(recordSubs.map((sub) => sub.topic));
  }

  function downloadJSON() {
    downloadTextFile(JSON.stringify(recordedData.current) || "{}", "fixture.json");
  }

  const historyRecorder = React.useMemo(() => {
    if (!recordingTopics) {
      return false;
    }
    return (
      <MessageHistoryDEPRECATED paths={recordingTopics} historySize={1}>
        {({ itemsByPath }) => {
          const frame = mapValues(itemsByPath, (items) => items.map(({ message }) => message));
          recordedData.current = {
            topics: filterMap(Object.keys(itemsByPath), (topic) =>
              itemsByPath[topic] && itemsByPath[topic].length
                ? { name: topic, datatype: topicsByName[topic].datatype }
                : null
            ),
            frame,
          };
          return null;
        }}
      </MessageHistoryDEPRECATED>
    );
  }, [recordingTopics, topicsByName]);

  return (
    <Container>
      <PanelToolbar floating />
      <h1>Recording</h1>
      <TextContent>
        Press to start recording topic data for debug purposes. The latest messages on each topic will be kept and
        formatted into a fixture that can be used to create a test.
      </TextContent>
      <Flex row wrap style={{ padding: "8px 0 32px" }}>
        <Button isPrimary small onClick={onRecordClick} data-test="internals-record-button">
          {recordingTopics ? `Recording ${recordingTopics.length} topics…` : "Record raw data"}
        </Button>
        <Dropdown
          disabled={!!recordingTopics}
          text={`Record from: ${recordGroup === RECORD_ALL ? "All panels" : recordGroup}`}
          value={recordGroup}
          onChange={(value) => setRecordGroup(value)}>
          <Item value={RECORD_ALL}>All panels</Item>
          {subscriptionGroups.map((group) => (
            <Item key={group} value={group}>
              {group}
            </Item>
          ))}
        </Dropdown>
        {recordingTopics && (
          <Button small onClick={downloadJSON} data-test="internals-download-button">
            Download JSON
          </Button>
        )}
        {historyRecorder}
      </Flex>
      <Flex row>
        <section data-test="internals-subscriptions">
          <h1>Subscriptions</h1>
          {renderedSubscriptions}
        </section>
        <section data-test="internals-publishers">
          <h1>Publishers</h1>
          {renderedPublishers}
        </section>
      </Flex>
    </Container>
  );
}
Internals.panelType = "Internals";
Internals.defaultConfig = {};

export default hot(Panel<{}>(Internals));
