// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { flatten, uniq, groupBy } from "lodash";
import { TimeUtil } from "rosbag";

import type { Message, SubscribePayload, Topic, BobjectMessage } from "webviz-core/src/players/types";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";
import { objectValues } from "webviz-core/src/util";
import { deepParse, isBobject, wrapJsObject } from "webviz-core/src/util/binaryObjects";
import { isComplex } from "webviz-core/src/util/binaryObjects/messageDefinitionUtils";
import { SECOND_SOURCE_PREFIX } from "webviz-core/src/util/globalConstants";
import sendNotification from "webviz-core/src/util/sendNotification";

type Callback<State> = ({| message: Message, state: State |}) => {| messages: Message[], state: State |};

export type NodeStates = {
  [node: string]: any,
};

export type NodeDefinition<State> = {
  callback: Callback<State>,
  defaultState: State,
  inputs: string[],
  output: Topic,
  datatypes: RosDatatypes,
  // Format is used both for input and output. Note: Message outputs from bobject nodes are
  // automatically converted from JS objects to wrapper bobjects if need be.
  format: "bobjects" | "parsedMessages",
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
  for (const datatype of objectValues(datatypes)) {
    for (const { type } of datatype.fields) {
      if (isComplex(type) && !datatypes[type]) {
        throw new Error(`The datatype "${type}" is not defined for node "${output.name}"`);
      }
    }
  }
  if (datatypes[output.datatype] == null) {
    throw new Error(`The datatype "${output.datatype}" is not defined for node "${output.name}"`);
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
  const { messages: unfilteredMessages, state } = nodeDefinition.callback({ message: inputMessage, state: inputState });

  const parsedMessages = unfilteredMessages
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
    .map((message) => ({
      ...message,
      receiveTime: inputMessage.receiveTime,
    }));

  return { state, messages: parsedMessages };
}

export function applyNodesToMessages({
  nodeDefinitions,
  originalMessages,
  originalBobjects,
  states,
  datatypes,
}: {|
  nodeDefinitions: NodeDefinition<*>[],
  originalMessages: $ReadOnlyArray<Message>,
  originalBobjects: $ReadOnlyArray<BobjectMessage>,
  states: NodeStates,
  datatypes: RosDatatypes,
|}): {| states: NodeStates, messages: $ReadOnlyArray<Message> |} {
  const messages = [...originalMessages, ...originalBobjects].sort((a, b) =>
    TimeUtil.compare(a.receiveTime, b.receiveTime)
  );
  // The input messages are processed in time order, interleaving bobjects and parsed messages:
  //  1a. parsed message x,
  //  1b. bobject message x,
  //
  // When a node is run on parsed message x, the node-generated output message is spliced into
  // the message stream between it and the corresponding bobject message:
  //  1a.  parsed message x,
  //  2a. node message y
  //  2b. node bobject y
  //  1a.  bobject message x,
  //
  //  So the partitioned outputs can look misordered. The bobjects from above:
  //  2b. node bobject y
  //  1a. bobject message x.
  //
  //  This is probably ok, because they have the same receiveTime, and don't depend on one another.

  // Have to do this the old-school way since we are appending to
  // `messages` in the process.
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    nodeDefinitions.forEach((nodeDefinition) => {
      const definitionIsBobjects = nodeDefinition.format === "bobjects";
      const formatMatches = definitionIsBobjects === isBobject(message.message);
      if (nodeDefinition.inputs.includes(message.topic) && formatMatches) {
        const previousState = states[nodeDefinition.output.name];
        let nodeResult = {
          messages: [],
          state: previousState,
        };
        try {
          nodeResult = applyNodeToMessage(nodeDefinition, message, previousState);
        } catch (error) {
          sendNotification(
            `Error running Webviz node: ${nodeDefinition.output.name}`,
            `${error} ${error.stack}`,
            "app",
            "error"
          );
        }
        states[nodeDefinition.output.name] = nodeResult.state;
        // Nodes often construct messages (instead of simply extracting submessages). We can wrap
        // their outputs if they haven't to make life easier for node writers.
        const messagesToAdd =
          nodeDefinition.format === "parsedMessages"
            ? nodeResult.messages
            : nodeResult.messages.map((nodeMessage) => {
                if (isBobject(nodeMessage.message)) {
                  return nodeMessage;
                }
                return {
                  receiveTime: nodeMessage.receiveTime,
                  topic: nodeMessage.topic,
                  message: wrapJsObject(datatypes, nodeDefinition.output.datatype, nodeMessage.message),
                };
              });
        messages.splice(i + 1, 0, ...messagesToAdd);
      }
    });
  }

  return { states, messages };
}

export function partitionMessagesBySubscription(
  messages: $ReadOnlyArray<Message>,
  subscriptions: SubscribePayload[],
  nodeDefinitions: NodeDefinition<*>[],
  datatypes: RosDatatypes
): { bobjects: BobjectMessage[], parsedMessages: Message[] } {
  const parsedMessages = [];
  const bobjects = [];

  const subscriptionsByTopic = groupBy(subscriptions, "topic");
  const definitionsByTopic = groupBy(nodeDefinitions, "output.name");

  for (const message of messages) {
    if (!isWebvizNodeTopic(message.topic)) {
      if (isBobject(message.message)) {
        bobjects.push(message);
      } else {
        parsedMessages.push(message);
      }
      continue;
    }
    const subs = subscriptionsByTopic[message.topic] || [];
    // There's at most two subscriptions (`parsedMessages` and `bobjects`).
    for (const { format } of subs) {
      if (format === "bobjects") {
        if (isBobject(message.message)) {
          bobjects.push(message);
        } else {
          const nodeDef = definitionsByTopic[message.topic] && definitionsByTopic[message.topic][0];
          if (!nodeDef) {
            throw new Error("Message produced from unsubscribed node. This should never happen.");
          }
          const msg = wrapJsObject(datatypes, nodeDef.output.datatype, message.message);
          bobjects.push({ ...message, message: msg });
        }
      } else {
        // Subscription format is parsed.
        if (isBobject(message.message)) {
          parsedMessages.push({
            receiveTime: message.receiveTime,
            topic: message.topic,
            message: deepParse(message.message),
          });
        } else {
          parsedMessages.push(message);
        }
      }
    }
  }

  return {
    parsedMessages,
    bobjects,
  };
}

export function getNodeSubscriptions(nodeDefinitions: NodeDefinition<*>[]): SubscribePayload[] {
  const allActiveNodes = uniq(
    flatten(nodeDefinitions.map((rootNode) => getDependentNodeDefinitions(nodeDefinitions.map((def) => def), rootNode)))
  );
  return flatten(
    allActiveNodes.map(({ format, inputs, output: { name } }) =>
      inputs.map((topic) => ({ topic, format, requester: { type: "node", name } }))
    )
  );
}

export function getDefaultNodeStates(nodeDefinitions: NodeDefinition<*>[]): NodeStates {
  const nodeStates = {};
  for (const { output, defaultState } of nodeDefinitions) {
    nodeStates[output.name] = defaultState;
  }
  return nodeStates;
}
