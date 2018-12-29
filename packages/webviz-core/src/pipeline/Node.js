// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { topicsByTopicName } from "webviz-core/src/selectors";
import type { Message, Timestamp, Topic } from "webviz-core/src/types/dataSources";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";

export type Listener = (Message) => void;

export const makeNodeMessage = (topic: string, datatype: string, receiveTime: Timestamp, message: any): Message => {
  return {
    op: "message",
    topic,
    datatype,
    message,
    receiveTime,
  };
};

type Callback<State> = ({| message: Message, state: State |}) => {| messages: Message[], state: State |};

export type NodeDefinition<State> = {
  name: string,
  callback: Callback<State>,
  defaultState: State,
  inputs: string[],
  outputs: Topic[],
  datatypes: RosDatatypes,
};

export default class Node {
  name: string;
  inputs: string[];
  outputs: Topic[];
  datatypes: RosDatatypes;

  _state: *;
  _defaultState: *;
  _callback: Callback<*>;
  _listener: Listener;
  _datatypeMap: { [topicName: string]: string } = {};

  constructor(nodeDefinition: NodeDefinition<*>) {
    this.name = nodeDefinition.name;
    this.inputs = nodeDefinition.inputs;
    this.outputs = nodeDefinition.outputs;
    this.datatypes = nodeDefinition.datatypes;
    this._callback = nodeDefinition.callback;
    this._defaultState = nodeDefinition.defaultState;

    // TODO(JP): Add simpleDeepFreeze here once rosbag.js has been changed to
    // only output simple objects.
    // simpleDeepFreeze(this._defaultState);

    // cache the outputs for faster message creation
    for (const topic of this.outputs) {
      this._datatypeMap[topic.name] = topic.datatype;
    }

    this.reset();
  }

  consume(msg: Message): void {
    const { messages, state } = this._callback({ message: msg, state: this._state });
    this._state = state;

    // TODO(JP): Add simpleDeepFreeze here once rosbag.js has been changed to
    // only output simple objects.
    // simpleDeepFreeze(this._state);

    for (const message of messages) {
      if (!message) {
        return;
      }
      const topic: ?Topic = topicsByTopicName(this.outputs)[message.topic];
      if (!topic) {
        console.warn(`message.topic "${message.topic}" not in outputs; message discarded`);
        return;
      }
      if (topic.datatype !== message.datatype) {
        console.warn(
          `message.datatype "${message.topic}" does not match topic.datatype "${topic.datatype}"; message discarded`
        );
      }
      this._listener(message);
    }
  }

  setListener(listener: Listener) {
    this._listener = listener;
  }

  reset() {
    this._state = this._defaultState;
  }
}
