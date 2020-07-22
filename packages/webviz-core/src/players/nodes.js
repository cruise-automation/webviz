// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { flatten, uniq } from "lodash";

import type { Message, SubscribePayload, Topic } from "webviz-core/src/players/types";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";
import { SECOND_SOURCE_PREFIX } from "webviz-core/src/util/globalConstants";
import sendNotification from "webviz-core/src/util/sendNotification";

type Callback<State> = ({| message: Message, state: State |}) => {| messages: Message[], state: State |};

export type NodeDefinition<State> = {
  callback: Callback<State>,
  defaultState: State,
  inputs: string[],
  output: Topic,
  datatypes: RosDatatypes,
};

const WEBVIZ_NODE_PREFIX = "/webviz/";

export function isWebvizNodeTopic(topic: string) {
  return topic.startsWith(WEBVIZ_NODE_PREFIX) || topic.startsWith(`${SECOND_SOURCE_PREFIX}${WEBVIZ_NODE_PREFIX}`);
}

export const makeNodeMessage = (topic: string, message: any): Message => {
  return {
    topic,
    message,
    receiveTime: { sec: 0, nsec: 0 }, // Gets set in `applyNodeToMessage`.
  };
};

function getDependentNodeDefinitions(
  nodeDefinitions: NodeDefinition<*>[],
  rootNode: NodeDefinition<*>
): NodeDefinition<*>[] {
  const dependentNodeDefs = [];
  // eslint-disable-next-line no-inner-declarations
  function traverse(def: NodeDefinition<*>) {
    if (dependentNodeDefs.includes(def)) {
      throw new Error(`Webviz Node ${rootNode.output.name} has a circular dependency!`);
    }
    dependentNodeDefs.push(def);
    const dependentDefs = nodeDefinitions.filter(({ output }) => def.inputs.includes(output.name));
    dependentDefs.forEach(traverse);
  }
  traverse(rootNode);
  return dependentNodeDefs;
}

function validateDatatypes({ output, datatypes }: NodeDefinition<*>) {
  for (const key of Object.keys(datatypes)) {
    for (const { type, isComplex } of datatypes[key].fields) {
      if (isComplex && !datatypes[type]) {
        throw new Error(`The datatype "${type}" is not defined for node "${output.name}"`);
      }
    }
  }
}

export function validateNodeDefinitions(nodeDefinitions: NodeDefinition<*>[]): void {
  for (const nodeDefinition of nodeDefinitions) {
    // Validate otuput topic names
    if (!isWebvizNodeTopic(nodeDefinition.output.name)) {
      throw new Error(
        `Webviz node: ${nodeDefinition.output.name} must output topics prefixed with ${WEBVIZ_NODE_PREFIX}`
      );
    }

    // Validate circular dependencies.
    getDependentNodeDefinitions(nodeDefinitions, nodeDefinition);
  }

  // Validate output topics.
  const topicNames = nodeDefinitions.map((nodeDefinition) => nodeDefinition.output.name);
  if (topicNames.length !== uniq(topicNames).length) {
    throw new Error(`Duplicate output topic names in nodes: ${JSON.stringify(topicNames)}`);
  }

  for (const def of nodeDefinitions) {
    validateDatatypes(def);
  }
}

function applyNodeToMessage<State>(
  nodeDefinition: NodeDefinition<State>,
  inputMessage: Message,
  inputState: State
): {| state: State, messages: Message[] |} {
  const { output } = nodeDefinition;
  const { messages, state } = nodeDefinition.callback({ message: inputMessage, state: inputState });

  const filteredMessages = messages
    .filter((message) => {
      if (!message) {
        return false;
      }
      if (message.topic !== output.name) {
        console.warn(`message.topic "${message.topic}" not output; message discarded`);
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
        const previousState = states[index];
        let nodeResult = {
          messages: [],
          state: previousState,
        };
        try {
          nodeResult = applyNodeToMessage(nodeDefinition, messages[i], previousState);
        } catch (error) {
          sendNotification(
            `Error running Webviz node: ${nodeDefinition.output.name}`,
            `${error} ${error.stack}`,
            "app",
            "error"
          );
        }

        states[index] = nodeResult.state;
        messages.splice(i + 1, 0, ...nodeResult.messages);
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
  const activeRootNodes = nodeDefinitions.filter(({ output }) => subscriptionNodeTopics.includes(output.name));
  const allActiveNodes = uniq(
    flatten(activeRootNodes.map((rootNode) => getDependentNodeDefinitions(nodeDefinitions, rootNode)))
  );
  return subscriptions.concat(
    flatten(
      allActiveNodes.map((node) =>
        node.inputs.map((topic) => ({ topic, requester: { type: "node", name: node.output.name } }))
      )
    )
  );
}
