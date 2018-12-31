// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { uniqWith, flatMap, isEqual } from "lodash";

import Node, { type Listener } from "./Node";
import type { NodeDefinition } from "webviz-core/src/pipeline/Node";
import type { Topic, Message, DataSourceMessage, SubscribePayload } from "webviz-core/src/types/dataSources";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";

const WEBVIZ_TOPIC_PREFIX = "/webviz";

// recursively collects all nodes in the graph upon which target depends
// this function throws an error if there are circular or self-referencing dependencies
// exported for testing
function validateAndGetDependentNodes(target: Node, nodes: Node[], rootNode: Node = target, dependents: Node[] = []) {
  const { inputs } = target;
  for (const input of inputs) {
    for (const node of nodes) {
      // check if node satisfies the input
      if (!node.outputs.find(({ name }) => name === input)) {
        continue;
      }
      if (node === target) {
        const message = `Node: ${target.name} depends on itself`;
        throw new Error(message);
      }
      if (node === rootNode) {
        const message = `${rootNode.name} has circular dependency`;
        throw new Error(message);
      }
      dependents.push(node);
      validateAndGetDependentNodes(node, nodes, rootNode, dependents);
    }
  }
  return uniqWith(dependents, (a, b) => a === b);
}

export default class NodeManager {
  datatypes: RosDatatypes = {};
  _nodes: Node[] = [];
  _subscribedNodes: Node[] = [];

  // the default listener just logs out an error
  _listener: Listener = (msg: Message) => {
    console.error("Message consumed by node manager before setListener called");
  };

  // the listener used for nodes - recursively consumes message
  _nodeListener: Listener = (msg: Message) => {
    this.consume(msg);
    this._listener(msg);
  };

  _validateNodeInputChain(nodes: Node[]): void {
    for (const node of nodes) {
      validateAndGetDependentNodes(node, nodes);
    }
  }

  constructor(nodeDefinitions: NodeDefinition<any>[] = []) {
    nodeDefinitions.forEach((nodeDefinition) => {
      this._registerNode(nodeDefinition);
    });
  }

  isInternalTopic(topic: string) {
    return topic.startsWith(WEBVIZ_TOPIC_PREFIX);
  }

  getExternalSubscriptionsFor(topic: string) {
    return this._getSubscriptionsFor(topic, true);
  }

  getInternalSubscriptionsFor(topic: string) {
    return this._getSubscriptionsFor(topic, false);
  }

  // get topics required for the requested webviz topic--can be toggled between external/internal topics.
  _getSubscriptionsFor(topic: string, getOnlyExternalTopics: boolean, results: SubscribePayload[] = []) {
    for (const node of this._nodes) {
      const outputs = node.outputs;
      const match = outputs.some((output) => output.name === topic);
      if (!match) {
        continue;
      }
      for (const topic of node.inputs) {
        if (this.isInternalTopic(topic)) {
          if (!getOnlyExternalTopics) {
            results.push({ topic, requester: { type: "node", name: node.name } });
          }
          this._getSubscriptionsFor(topic, getOnlyExternalTopics, results);
        } else {
          results.push({ topic, requester: { type: "node", name: node.name } });
        }
      }
    }
    return results;
  }

  getAllOutputs(): Topic[] {
    const allTopics = flatMap(this._nodes, (node: Node): Topic[] => node.outputs);
    return uniqWith(allTopics, isEqual);
  }

  getSubscribedOutputs(): Topic[] {
    const allTopics = flatMap(this._subscribedNodes, (node: Node): Topic[] => node.outputs);
    return uniqWith(allTopics, isEqual);
  }

  getSubscribedNodes(): Node[] {
    return this._subscribedNodes;
  }

  _registerNode(nodeDefinition: NodeDefinition<*>): void {
    const node = new Node(nodeDefinition);
    for (const output of node.outputs) {
      if (!this.isInternalTopic(output.name)) {
        // for now we'd like all "internal" nodes to be prefixed with /webviz to make
        // it easy to identify which nodes are running within webviz and which are external
        // this is up for debate if it causes problems
        throw new Error(`Webviz node: ${node.name} must output topics prefixed with ${WEBVIZ_TOPIC_PREFIX}`);
      }
    }
    this._nodes.push(node);
    this._validateNodeInputChain(this._nodes);
    node.setListener(this._nodeListener);
    this.datatypes = { ...this.datatypes, ...node.datatypes };
  }

  updateInternalSubscriptions(subscriptions: SubscribePayload[]) {
    return this._updateInternalSubscriptions(subscriptions);
  }

  // Updates the source of truth on which nodes get `consume` called on.
  _updateInternalSubscriptions(
    subscriptions: SubscribePayload[],
    results?: { newNodes: Node[], newTopics: SubscribePayload[] } = { newNodes: [], newTopics: [] },
    parentNode?: Node
  ): SubscribePayload[] {
    for (const currentNode of this._nodes) {
      const isNodeSubscribedTo = subscriptions.some(({ topic }) =>
        currentNode.outputs.some(({ name }) => name === topic)
      );
      if (isNodeSubscribedTo) {
        // Node has already been added to the list of subscribed nodes.
        if (results.newNodes.includes(currentNode)) {
          continue;
        }
        results.newNodes.push(currentNode);
        // If not a recursive call, parentNode will be undefined and the requester will be set properly
        // by the caller.
        if (parentNode) {
          const newTopic = {
            topic: currentNode.outputs[0].name,
            requester: {
              name: parentNode.name,
              type: "node",
            },
          };
          results.newTopics.push(newTopic);
        }
        // If any inputs of the current node are an internal topic, need to add it to the list too
        for (const topic of currentNode.inputs) {
          if (this.isInternalTopic(topic)) {
            this._updateInternalSubscriptions([{ topic }], results, currentNode);
          }
        }
      }
    }
    this._subscribedNodes = results.newNodes;
    return results.newTopics;
  }

  consume(msg: DataSourceMessage): void {
    if (msg.op === "seek") {
      this.resetNodeStates();
    } else if (msg.op === "message") {
      for (let i = 0; i < this._subscribedNodes.length; i++) {
        const node = this._subscribedNodes[i];
        if (node.inputs.includes(msg.topic)) {
          node.consume(msg);
        }
      }
    }
  }

  setListener(listener: Listener): void {
    this._listener = listener;
  }

  resetNodeStates(): void {
    for (const node of this._nodes) {
      node.reset();
    }
  }
}
