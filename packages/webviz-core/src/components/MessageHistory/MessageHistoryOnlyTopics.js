// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { difference, flatten, groupBy, isEqual } from "lodash";
import * as React from "react";
import { connect } from "react-redux";
import type { Time } from "rosbag";

import { subscribe, unsubscribe } from "webviz-core/src/actions/player";
import PerfMonitor from "webviz-core/src/components/PerfMonitor";
import type { State as ReduxState } from "webviz-core/src/reducers";
import { getTopicNames, shallowEqualSelector } from "webviz-core/src/selectors";
import type { Frame, Message, Topic } from "webviz-core/src/types/players";

// This is an internal component which is the "old <MessageHistory>", which only supports topics,
// not full paths. Since full paths are a superset of topics, we figured we'd not expose this
// internal component to end users, but it's useful to keep as a separate abstraction so the logic
// here is not tangled up with the logic of paths.
//
// We store history globally so that we are not storing messages multiple times, and also to allow
// for immediately providing messages that we were already storing when mounting a fresh component,
// instead of having to wait until the next frame.
// don't put { sec: 0, nsec: 0 } inline as we do identity check for memoization
const DEFAULT_START_TIME = { sec: 0, nsec: 0 };

let gMessagesByTopic: { [string]: Message[] } = {};
let generatedId = 0;
let gLastFrame: ?Frame;
let gLastLastSeekTime: ?number;
function resetData() {
  gMessagesByTopic = {};
  gLastFrame = undefined;
  gLastLastSeekTime = undefined;
  generatedId = 0;
}

export function getRawItemsByTopicForTests() {
  return gMessagesByTopic;
}

// Little helper function for generating a frame for in storybook / screenshot test fixtures.
window.debugGetFixture = (filterTopics?: string[], historySize = Infinity) => {
  const topics = [];
  const frame = {};
  for (const topic of filterTopics || Object.keys(gMessagesByTopic)) {
    const messages = gMessagesByTopic[topic] || [];
    if (messages.length > 0) {
      topics.push({ name: topic, datatype: messages[0].datatype });
      frame[topic] = messages.slice(-historySize);
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

function loadFrame(frame: Frame, lastSeekTime: number, startTime: Time) {
  if (gLastLastSeekTime !== undefined && gLastLastSeekTime !== lastSeekTime) {
    // When `lastSeekTime` changes (which should happen when seeking, when wrapping, and
    // when attaching a new Player, clear out everything, since there is a discontinuity in playback.
    resetData();
  }
  gLastLastSeekTime = lastSeekTime;

  if (gLastFrame === frame) {
    return;
  }
  gLastFrame = frame;

  // $FlowFixMe - Flow does not like Object.values
  const newMessagesByTopic = groupBy(flatten(Object.values(frame)), (message) => message.topic);
  for (const topic of Object.keys(newMessagesByTopic)) {
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

    gMessagesByTopic[topic] = (gMessagesByTopic[topic] || []).concat(newMessagesByTopic[topic]).slice(-historySize);
    // mark gMessageByTopic as changed by incrementing the id, reset if it's getting too big
    generatedId++;
    if (generatedId > 4294967295) {
      generatedId = 0;
    }
  }
}

type MessageHistoryOnlyTopicsData = {|
  messagesByTopic: { [string]: Message[] },
  cleared: boolean,
  startTime: Time,
|};

type Props = {
  children: (MessageHistoryOnlyTopicsData) => React.Node,
  panelType: ?string,
  topics: string[],
  // Use an object to set a specific history size for specific topics.
  historySize: number | { [topicName: string]: number },
  imageScale?: number,

  // By default message history will try to subscribe to topics
  // even if they don't existing in the player topic's list.
  // You can disable this behavior for typeahead scenarios or when
  // you expect user specified topics which are likely to not exist in the player
  // to prevent a lot of subscribing to non-existant topics.
  ignoreMissing?: boolean,

  // redux state
  frame: Frame,
  lastSeekTime: number,
  startTime: Time,
  playerTopics: Topic[],

  // redux actions
  subscribe: typeof subscribe,
  unsubscribe: typeof unsubscribe,
};

type ChildrenSelectorInput = {
  topics: string[],
  historySize: number | { [topicName: string]: number },
  gMessagesByTopic: { [string]: Message[] },
  generatedId: number,
  cleared: boolean,
  startTime: Time,
};

const getMemoizedChildrenInput = shallowEqualSelector(
  (input: ChildrenSelectorInput): ChildrenSelectorInput => input,
  ({ topics, historySize, gMessagesByTopic, generatedId, cleared, startTime }: ChildrenSelectorInput) => {
    const messagesByTopic = {};
    for (const topic of topics) {
      const historySizeForThisTopic = typeof historySize === "object" ? historySize[topic] : historySize;
      messagesByTopic[topic] = (gMessagesByTopic[topic] || []).slice(-(historySizeForThisTopic || Infinity));
    }
    return {
      messagesByTopic,
      cleared,
      startTime,
    };
  }
);

// Be sure to pass in a new render function when you want to force a rerender.
// So you probably don't want to do
// `<MessageHistoryOnlyTopics>{this._renderSomething}</MessageHistoryOnlyTopics>`.
// This might be a bit counterintuitive but we do this since performance matters here.
class MessageHistoryOnlyTopics extends React.Component<Props> {
  _subscribedTopics: string[] = [];
  _lastMessagesByTopic: { [string]: ?(Message[]) } = {};
  _cleared = false;

  static defaultProps = {
    historySize: Infinity,
  };

  constructor(props) {
    super(props);
    this._updateSubscriptions(props.topics, props.playerTopics);
    loadFrame(props.frame, props.lastSeekTime, props.startTime);
  }

  componentDidMount() {
    // These are kept in componentDidMount in addition to the constructor so we don't end up with
    // incorrect subscriptions when using hot module reloading.
    const { topics, playerTopics } = this.props;
    this._updateSubscriptions(topics, playerTopics);
  }

  componentWillUnmount() {
    this._updateSubscriptions([], this.props.playerTopics);
  }

  shouldComponentUpdate(nextProps: Props): boolean {
    if (this.props.imageScale !== nextProps.imageScale) {
      throw new Error("Changing imageScale is not supported; please remount instead.");
    }

    let shouldUpdate = false;
    if (!isEqual(this.props.topics, nextProps.topics)) {
      this._updateSubscriptions(nextProps.topics, nextProps.playerTopics);
      shouldUpdate = true;
    }
    if (this.props.playerTopics !== nextProps.playerTopics) {
      // If the list of valid topics have changed, be sure to subscribe to the
      // right topics. No need to set `shouldUpdate` though.
      this._updateSubscriptions(nextProps.topics, nextProps.playerTopics);
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
        if (this._lastMessagesByTopic[topic] !== gMessagesByTopic[topic]) {
          this._lastMessagesByTopic[topic] = gMessagesByTopic[topic];
          shouldUpdate = true;
        }
      }
    }

    return shouldUpdate;
  }

  _updateSubscriptions(newTopics: string[], playerTopics: Topic[]) {
    let encodingAndScalePayload = {};
    if (this.props.imageScale !== undefined) {
      // We might be able to remove the `encoding` field from the protocol entirely, and only
      // use scale. Or we can deal with scaling down in a different way altogether, such as having
      // special topics or syntax for scaled down versions of images or so. In any case, we should
      // be cautious about having metadata on subscriptions, as that leads to the problem of how to
      // deal with multiple subscriptions to the same topic but with different metadata.
      encodingAndScalePayload = { encoding: "image/compressed", scale: this.props.imageScale };
    }

    const { ignoreMissing } = this.props;
    // Filter out valid topic names, otherwise things might be slow when typing in an autocomplete.
    // TODO(JP): It would be nice to move this to the player or Pipeline or so, so that the
    // Internals panel can still show these subscriptions.
    const validTopicNames = getTopicNames(playerTopics);
    const newSubscribedTopics = ignoreMissing
      ? newTopics.filter((topicName) => validTopicNames.includes(topicName))
      : newTopics;
    const requester = this.props.panelType ? { type: "panel", name: this.props.panelType } : undefined;
    for (const topic of difference(this._subscribedTopics, newSubscribedTopics)) {
      this.props.unsubscribe({ topic, requester, ...encodingAndScalePayload });
      delete this._lastMessagesByTopic[topic]; // Not really necessary, but nice when debugging.
      const index = gComponentsByTopic[topic].indexOf(this);
      if (index === -1) {
        throw new Error(`Current component not found in gComponentsByTopic["${topic}"]!`);
      }
      gComponentsByTopic[topic].splice(index, 1);
      if (gComponentsByTopic[topic].length === 0) {
        delete gComponentsByTopic[topic];
        delete gMessagesByTopic[topic];
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
    const { historySize, topics, startTime, children } = this.props;

    const childrenInput = getMemoizedChildrenInput({
      topics,
      historySize,
      gMessagesByTopic,
      generatedId,
      cleared: this._cleared,
      startTime,
    });

    return <PerfMonitor>{children(childrenInput)}</PerfMonitor>;
  }
}

export default connect(
  (state: ReduxState) => ({
    frame: state.player.frame,
    lastSeekTime: state.player.lastSeekTime,
    startTime: state.player.startTime || DEFAULT_START_TIME,
    playerTopics: state.player.topics,
  }),
  { subscribe, unsubscribe }
)(MessageHistoryOnlyTopics);
