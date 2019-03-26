// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { flatten, uniq } from "lodash";

import { topicsByTopicName } from "webviz-core/src/selectors";
import type { Message, SubscribePayload, Topic } from "webviz-core/src/types/players";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";

type Callback<State> = ({| message: Message, state: State |}) => {| messages: Message[], state: State |};

export type NodeDefinition<State> = {
  name: string,
  callback: Callback<State>,
  defaultState: State,
  inputs: string[],
  outputs: Topic[],
  datatypes: RosDatatypes,
};

const WEBVIZ_TOPIC_PREFIX = "/webviz/";

export function isWebvizNodeTopic(topic: string) {
  return topic.startsWith(WEBVIZ_TOPIC_PREFIX);
}

export const makeNodeMessage = (topic: string, datatype: string, message: any): Message => {
  return {
    op: "message",
    topic,
    datatype,
    message,
    receiveTime: { sec: 0, nsec: 0 }, // Gets set in `applyNodeToMessage`.
  };
};

function getDependentNodeDefinitions(
  nodeDefinitions: NodeDefinition<*>[],
  rootNode: NodeDefinition<*>
): NodeDefinition<*>[] {
  const output = [];
  // eslint-disable-next-line no-inner-declarations
  function traverse(def: NodeDefinition<*>) {
    if (output.includes(def)) {
      throw new Error(`Webviz Node: ${rootNode.name} has a circular dependency!`);
    }
    output.push(def);
    const dependentDefintions = nodeDefinitions.filter((dep) =>
      dep.outputs.find((topic) => def.inputs.includes(topic.name))
    );
    dependentDefintions.forEach(traverse);
  }
  traverse(rootNode);
  return output;
}

export function validateNodeDefinitions(nodeDefinitions: NodeDefinition<*>[]): void {
  for (const nodeDefinition of nodeDefinitions) {
    // Validate otuput topic names
    for (const topic of nodeDefinition.outputs) {
      if (!isWebvizNodeTopic(topic.name)) {
        throw new Error(`Webviz node: ${nodeDefinition.name} must output topics prefixed with ${WEBVIZ_TOPIC_PREFIX}`);
      }
    }

    // Validate circular dependencies.
    getDependentNodeDefinitions(nodeDefinitions, nodeDefinition);
  }

  // Validate output topics.
  const topicNames = flatten(nodeDefinitions.map((nodeDefinition) => nodeDefinition.outputs)).map(({ name }) => name);
  if (topicNames.length !== uniq(topicNames).length) {
    throw new Error(`Duplicate output topic names in nodes: ${JSON.stringify(topicNames)}`);
  }
}

function applyNodeToMessage<State>(
  nodeDefinition: NodeDefinition<State>,
  inputMessage: Message,
  inputState: State
): {| state: State, messages: Message[] |} {
  const topicNameToTopic = topicsByTopicName(nodeDefinition.outputs);
  const { messages, state } = nodeDefinition.callback({ message: inputMessage, state: inputState });

  const filteredMessages = messages
    .filter((message) => {
      if (!message) {
        return false;
      }
      const topic: ?Topic = topicNameToTopic[message.topic];
      if (!topic) {
        console.warn(`message.topic "${message.topic}" not in outputs; message discarded`);
        return false;
      }
      if (topic.datatype !== message.datatype) {
        console.warn(
          `message.datatype "${message.topic}" does not match topic.datatype "${topic.datatype}"; message discarded`
        );
        return false;
      }
      return true;
    })
    // Make sure the `receiveTime` is identical to the `inputMessage` so we don't get out of order messages.
    .map((message) => ({ ...message, receiveTime: inputMessage.receiveTime }));

  return { state, messages: filteredMessages };
}

export function applyNodesToMessages(
  nodeDefinitions: NodeDefinition<*>[],
  originalMessages: Message[],
  originalStates: ?(any[])
): {| states: any[], messages: Message[] |} {
  const states = originalStates ? [...originalStates] : nodeDefinitions.map(({ defaultState }) => defaultState);
  const messages = [...originalMessages];

  // Have to do this the old-school way since we are appending to
  // `messages` in the process.
  for (let i = 0; i < messages.length; i++) {
    nodeDefinitions.forEach((nodeDefinition, index) => {
      if (nodeDefinition.inputs.includes(messages[i].topic)) {
        const { messages: newMessages, state } = applyNodeToMessage(nodeDefinition, messages[i], states[index]);
        states[index] = state;
        messages.splice(i + 1, 0, ...newMessages);
      }
    });
  }

  return { states, messages };
}

export function getNodeSubscriptions(
  nodeDefinitions: NodeDefinition<*>[],
  subscriptions: SubscribePayload[]
): SubscribePayload[] {
  const subscriptionNodeTopics = subscriptions.map(({ topic }) => topic).filter((topic) => isWebvizNodeTopic(topic));
  const activeRootNodes = nodeDefinitions.filter(({ outputs }) =>
    outputs.find(({ name }) => subscriptionNodeTopics.includes(name))
  );
  const allActiveNodes = uniq(
    flatten(activeRootNodes.map((rootNode) => getDependentNodeDefinitions(nodeDefinitions, rootNode)))
  );
  return subscriptions.concat(
    flatten(
      allActiveNodes.map((node) =>
        node.inputs.map((topic) => ({ topic, requester: { type: "node", name: node.name } }))
      )
    )
  );
}
