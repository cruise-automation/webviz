// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { difference, groupBy, isEqual, last } from "lodash";
import * as React from "react";
import { connect } from "react-redux";

import type { RawItem, RawItemsByTopic } from "./internalCommon";
import { subscribe, unsubscribe } from "webviz-core/src/actions/dataSource";
import { TOPICS_WITH_INCORRECT_HEADERS } from "webviz-core/src/components/MessageHistory/internalCommon";
import PerfMonitor from "webviz-core/src/components/PerfMonitor";
import type { State as ReduxState } from "webviz-core/src/reducers";
import { getTopicNames } from "webviz-core/src/selectors";
import type { Frame, Timestamp, Topic } from "webviz-core/src/types/dataSources";
import { CLOCK_TOPIC } from "webviz-core/src/util/globalConstants";
import { subtractTimes } from "webviz-core/src/util/time";

// This is an internal component which is the "old <MessageHistory>", which only supports topics,
// not full paths. Since full paths are a superset of topics, we figured we'd not expose this
// internal component to end users, but it's useful to keep as a separate abstraction so the logic
// here is not tangled up with the logic of paths.
//
// We store history globally so that we are not storing messages multiple times, and also to allow
// for immediately providing messages that we were already storing when mounting a fresh component,
// instead of having to wait until the next frame.

let gRawItemsByTopic: RawItemsByTopic = {};
let gLastTimestamp: ?Timestamp;
let gLastFrame: ?Frame;
let gLastLastSeekTime: ?number;
function resetData() {
  gRawItemsByTopic = {};
  gLastTimestamp = undefined;
  gLastFrame = undefined;
  gLastLastSeekTime = undefined;
}

export function getRawItemsByTopicForTests() {
  return gRawItemsByTopic;
}

// Little helper function for generating a frame for in storybook / screenshot test fixtures.
window.debugGetFixture = (filterTopics?: string[], historySize = Infinity) => {
  const topics = [];
  const frame = {};
  for (const topic of filterTopics || Object.keys(gRawItemsByTopic)) {
    const items = gRawItemsByTopic[topic] || [];
    if (items.length > 0) {
      topics.push({ name: topic, datatype: items[0].message.datatype });
      frame[topic] = items.map((item) => item.message).slice(-historySize);
    }
  }
  return { topics, frame };
};

// eslint-disable-next-line no-use-before-define
type ComponentsByTopic = { [string]: MessageHistoryOnlyTopics[] };
let gComponentsByTopic: ComponentsByTopic = {};

// When in tests, reset everything before each test.
if (window.beforeEach) {
  beforeEach(() => {
    resetData();
    gComponentsByTopic = {};
  });
}

function loadFrame(frame: Frame, lastSeekTime: number, startTime: Timestamp) {
  if (gLastLastSeekTime !== undefined && gLastLastSeekTime !== lastSeekTime) {
    // When `lastSeekTime` changes (which should happen when seeking, when wrapping, and
    // when attaching a new DataSource, clear out everything, since there is a discontinuity in playback.
    resetData();
  }
  gLastLastSeekTime = lastSeekTime;

  if (gLastFrame === frame) {
    return;
  }
  gLastFrame = frame;

  if (frame[CLOCK_TOPIC] && frame[CLOCK_TOPIC].length) {
    gLastTimestamp = last(frame[CLOCK_TOPIC]).message.clock;
  }

  const newRawItems: RawItem[] = [];
  for (const topic of Object.keys(frame)) {
    frame[topic].forEach((message) => {
      // TODO(JP): This logic should be revamped when getting rid of /webviz/clock.
      if (message.message.header && message.message.header.stamp && !TOPICS_WITH_INCORRECT_HEADERS.includes(topic)) {
        newRawItems.push({
          message,
          timestamp: message.message.header.stamp,
          elapsedSinceStart: subtractTimes(message.message.header.stamp, startTime),
          hasAccurateTimestamp: true,
        });
      } else if (topic === CLOCK_TOPIC) {
        newRawItems.push({
          message,
          timestamp: message.message.clock,
          elapsedSinceStart: subtractTimes(message.message.clock, startTime),
          hasAccurateTimestamp: true,
        });
      } else if (gLastTimestamp) {
        newRawItems.push({
          message,
          timestamp: gLastTimestamp,
          elapsedSinceStart: subtractTimes(gLastTimestamp, startTime),
          hasAccurateTimestamp: false,
        });
      } else if (message.receiveTime) {
        newRawItems.push({
          message,
          timestamp: message.receiveTime,
          elapsedSinceStart: subtractTimes(message.receiveTime, startTime),
          hasAccurateTimestamp: false,
        });
      }
    });
  }

  const newRawItemsByTopic = groupBy(newRawItems, (item) => item.message.topic);
  for (const topic of Object.keys(newRawItemsByTopic)) {
    if (!gComponentsByTopic[topic]) {
      continue;
    }

    const historySize = Math.max(
      0,
      ...gComponentsByTopic[topic].map(
        (comp) =>
          (typeof comp.props.historySize === "object" ? comp.props.historySize[topic] : comp.props.historySize) ||
          Infinity
      )
    );

    gRawItemsByTopic[topic] = (gRawItemsByTopic[topic] || []).concat(newRawItemsByTopic[topic]).slice(-historySize);
  }
}

type MessageHistoryOnlyTopicsData = {|
  itemsByTopic: RawItemsByTopic,
  cleared: boolean,
  startTime: Timestamp,
|};

type Props = {
  children: (MessageHistoryOnlyTopicsData) => React.Node,
  panelType: ?string,
  topics: string[],
  // Use an object to set a specific history size for specific topics.
  historySize?: number | { [topicName: string]: number },
  imageScale?: number,

  // By default message history will try to subscribe to topics
  // even if they don't existing in the datasource topic's list.
  // You can disable this behavior for typeahead scenarios or when
  // you expect user specified topics which are likely to not exist in the datasource
  // to prevent a lot of subscribing to non-existant topics.
  ignoreMissing?: boolean,

  // redux state
  frame: Frame,
  lastSeekTime: number,
  startTime: Timestamp,
  dataSourceTopics: Topic[],

  // redux actions
  subscribe: typeof subscribe,
  unsubscribe: typeof unsubscribe,
};

// Be sure to pass in a new render function when you want to force a rerender.
// So you probably don't want to do
// `<MessageHistoryOnlyTopics>{this._renderSomething}</MessageHistoryOnlyTopics>`.
// This might be a bit counterintuitive but we do this since performance matters here.
class MessageHistoryOnlyTopics extends React.Component<Props> {
  _subscribedTopics: string[] = [];
  _lastRawItemsByTopic: { [string]: ?(RawItem[]) } = {};
  _cleared = false;

  constructor(props) {
    super(props);
    this._updateSubscriptions(props.topics, props.dataSourceTopics);
    loadFrame(props.frame, props.lastSeekTime, props.startTime);
  }

  componentDidMount() {
    // These are kept in componentDidMount in addition to the constructor so we don't end up with
    // incorrect subscriptions when using hot module reloading.
    const { topics, panelType, dataSourceTopics, subscribe } = this.props;
    this._updateSubscriptions(topics, dataSourceTopics);
    const requester = panelType ? { type: "panel", name: panelType } : undefined;
    subscribe({ topic: CLOCK_TOPIC, requester });
  }

  componentWillUnmount() {
    const { panelType } = this.props;
    const requester = panelType ? { type: "panel", name: panelType } : undefined;
    this.props.unsubscribe({ topic: CLOCK_TOPIC, requester });
    this._updateSubscriptions([], this.props.dataSourceTopics);
  }

  shouldComponentUpdate(nextProps: Props): boolean {
    if (this.props.imageScale !== nextProps.imageScale) {
      throw new Error("Changing imageScale is not supported; please remount instead.");
    }

    let shouldUpdate = false;
    if (!isEqual(this.props.topics, nextProps.topics)) {
      this._updateSubscriptions(nextProps.topics, nextProps.dataSourceTopics);
      shouldUpdate = true;
    }
    if (this.props.dataSourceTopics !== nextProps.dataSourceTopics) {
      // If the list of valid topics have changed, be sure to subscribe to the
      // right topics. No need to set `shouldUpdate` though.
      this._updateSubscriptions(nextProps.topics, nextProps.dataSourceTopics);
    }
    if (this.props.children !== nextProps.children) {
      shouldUpdate = true;
    }
    if (this.props.frame !== nextProps.frame || this.props.lastSeekTime !== nextProps.lastSeekTime) {
      if (this.props.lastSeekTime !== nextProps.lastSeekTime) {
        this._cleared = true;
        shouldUpdate = true;
      }
      loadFrame(nextProps.frame, nextProps.lastSeekTime, nextProps.startTime);
      for (const topic of this._subscribedTopics) {
        if (this._lastRawItemsByTopic[topic] !== gRawItemsByTopic[topic]) {
          this._lastRawItemsByTopic[topic] = gRawItemsByTopic[topic];
          shouldUpdate = true;
        }
      }
    }

    return shouldUpdate;
  }

  _updateSubscriptions(newTopics: string[], dataSourceTopics: Topic[]) {
    let encodingAndScalePayload = {};
    if (this.props.imageScale !== 1) {
      // We might be able to remove the `encoding` field from the protocol entirely, and only
      // use scale. Or we can deal with scaling down in a different way altogether, such as having
      // special topics or syntax for scaled down versions of images or so. In any case, we should
      // be cautious about having metadata on subscriptions, as that leads to the problem of how to
      // deal with multiple subscriptions to the same topic but with different metadata.
      encodingAndScalePayload = { encoding: "image/compressed", scale: this.props.imageScale };
    }

    const { ignoreMissing } = this.props;
    // Filter out valid topic names, otherwise things might be slow when typing in an autocomplete.
    // TODO(JP): It would be nice to move this to the dataSource or Pipeline or so, so that the
    // Internals panel can still show these subscriptions.
    const validTopicNames = getTopicNames(dataSourceTopics);
    const newSubscribedTopics = ignoreMissing
      ? newTopics.filter((topicName) => validTopicNames.includes(topicName))
      : newTopics;
    const requester = this.props.panelType ? { type: "panel", name: this.props.panelType } : undefined;
    for (const topic of difference(this._subscribedTopics, newSubscribedTopics)) {
      this.props.unsubscribe({ topic, requester, ...encodingAndScalePayload });
      delete this._lastRawItemsByTopic[topic]; // Not really necessary, but nice when debugging.
      const index = gComponentsByTopic[topic].indexOf(this);
      if (index === -1) {
        throw new Error(`Current component not found in gComponentsByTopic["${topic}"]!`);
      }
      gComponentsByTopic[topic].splice(index, 1);
      if (gComponentsByTopic[topic].length === 0) {
        delete gComponentsByTopic[topic];
        delete gRawItemsByTopic[topic];
      }
    }
    for (const topic of difference(newSubscribedTopics, this._subscribedTopics)) {
      this.props.subscribe({ topic, requester, ...encodingAndScalePayload });
      gComponentsByTopic[topic] = gComponentsByTopic[topic] || [];
      gComponentsByTopic[topic].push(this);
    }
    this._subscribedTopics = newSubscribedTopics;
  }

  componentDidUpdate() {
    this._cleared = false;
  }

  render() {
    const { historySize, startTime } = this.props;
    const itemsByTopic = {};
    for (const topic of this.props.topics) {
      const historySizeForThisTopic = typeof historySize === "object" ? historySize[topic] : historySize;
      itemsByTopic[topic] = (gRawItemsByTopic[topic] || []).slice(-(historySizeForThisTopic || Infinity));
    }

    return <PerfMonitor>{this.props.children({ itemsByTopic, cleared: this._cleared, startTime })}</PerfMonitor>;
  }
}

export default connect(
  (state: ReduxState) => ({
    frame: state.dataSource.frame,
    lastSeekTime: state.dataSource.lastSeekTime,
    startTime: state.dataSource.startTime || { sec: 0, nsec: 0 },
    dataSourceTopics: state.dataSource.topics,
  }),
  { subscribe, unsubscribe }
)(MessageHistoryOnlyTopics);
