// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { flatten, uniq } from "lodash";

import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import Multiset from "webviz-core/src/pipeline/Multiset";
import {
  type NodeDefinition,
  applyNodesToMessages,
  getNodeSubscriptions,
  isWebvizNodeTopic,
} from "webviz-core/src/pipeline/nodes";
import PlayerDispatcher from "webviz-core/src/pipeline/PlayerDispatcher";
import type {
  Player,
  SubscribePayload,
  AdvertisePayload,
  PublishPayload,
  PlayerMessage,
  TopicsMessage,
} from "webviz-core/src/types/players";
import type { Dispatch } from "webviz-core/src/types/Store";
import Logger from "webviz-core/src/util/Logger";

const log = new Logger(__filename);

function subscriptionsEqual(a: SubscribePayload, b: SubscribePayload) {
  return a.topic === b.topic && a.encoding === b.encoding && a.scale === b.scale;
}

function publishersEqual(a: AdvertisePayload, b: AdvertisePayload) {
  return a.topic === b.topic && a.datatype === b.datatype;
}

// manages subscript/unsubscription of topics
// and pushes messages from external topics through webviz nodes
// and into the player dispatcher
export default class Pipeline {
  dispatcher: ?PlayerDispatcher;
  player: ?Player;
  _nodeDefinitions: NodeDefinition<any>[] = [];
  _nodeStates: any[];
  _externalTopics: {| datatype: ?string, topic: string, originalTopic?: string |}[] = [];
  _subscriptions: Multiset<SubscribePayload> = new Multiset(subscriptionsEqual);
  _publishers: Multiset<AdvertisePayload> = new Multiset(publishersEqual);

  // support nodeDefinitions injection for tests
  constructor(nodeDefinitions: ?(NodeDefinition<any>[])) {
    if (nodeDefinitions) {
      this._nodeDefinitions = nodeDefinitions;
    } else {
      this._nodeDefinitions = getGlobalHooks().nodes();
    }
  }

  getAllSubscriptions() {
    return [
      ...this._subscriptions.allItems(),
      ...getNodeSubscriptions(this._nodeDefinitions, this._subscriptions.allItems()),
    ];
  }

  _getExternalSubscriptions() {
    return this.getAllSubscriptions().filter(({ topic }) => !isWebvizNodeTopic(topic));
  }

  getAllExternalPublishers() {
    return this._publishers.allItems();
  }

  _resetNodeStates() {
    this._nodeStates = this._nodeDefinitions.map((def) => def.defaultState);
  }

  // initialize the pipeline with a redux dispatcher and an external player
  // you should call this again whenever the player changes
  async initialize(dispatch: Dispatch, player: Player) {
    this.dispatcher = new PlayerDispatcher(dispatch);

    this.dispatcher.setReadyForMore(() => {
      if (this.player) {
        this.player.requestMessages();
      }
    });

    this._resetNodeStates();

    // wait for the listener to be set, indicating the player is connected
    // and ready to start emitting messages
    await player.setListener((msg: PlayerMessage) => {
      // append webviz node topics to the player topic list
      if (msg.op === "topics") {
        this._externalTopics = msg.topics || [];
        return this._publishAllTopics();
      }
      if (!this.dispatcher) {
        log.error("Could not consume message. Dispatcher is null");
        return Promise.resolve();
      }
      const dispatcher = this.dispatcher;
      if (msg.op === "datatypes") {
        let datatypes = { ...msg.datatypes };
        for (const nodeDefinition of this._nodeDefinitions) {
          datatypes = { ...nodeDefinition.datatypes, ...datatypes };
        }
        return dispatcher.consumeMessage({ op: "datatypes", datatypes });
      }
      if (msg.op === "seek" || msg.op === "connected") {
        this._resetNodeStates();
        return dispatcher.consumeMessage(msg);
      }
      if (msg.op === "message") {
        const { states, messages } = applyNodesToMessages(this._nodeDefinitions, [msg], this._nodeStates);
        this._nodeStates = states;
        // $FlowFixMe - Flow doesn't seem to understand this.
        return Promise.all(uniq(messages.map((message) => dispatcher.consumeMessage(message))));
      }
      return dispatcher.consumeMessage(msg);
    });

    this.player = player;

    // ensure any pending subscriptions are established once the player is connected
    player.setSubscriptions(this._getExternalSubscriptions());
    player.setPublishers(this.getAllExternalPublishers());
  }

  // publish a list of topics consisting of external topics
  // combined with all available webviz node topics
  _publishAllTopics(): Promise<void> {
    const { dispatcher } = this;
    if (!dispatcher) {
      log.error("Could not publish topics. Dispatcher is null");
      return Promise.resolve();
    }
    const msg: TopicsMessage = {
      op: "topics",
      topics: [
        ...this._externalTopics,
        ...flatten(this._nodeDefinitions.map((nodeDefinition) => nodeDefinition.outputs)).map(({ datatype, name }) => ({
          datatype,
          topic: name,
        })),
      ],
    };
    return dispatcher.consumeMessage(msg);
  }

  // subscribe to a topic - either an external topic or webviz node
  subscribe(request: SubscribePayload) {
    const isNew = this._subscriptions.add(request);
    const { player } = this;
    if (!player || !isNew) {
      return;
    }
    log.debug("subscribe", request);
    player.setSubscriptions(this._getExternalSubscriptions());
  }

  // unsubscribe from a topic - either an external topic or webviz node
  unsubscribe(request: SubscribePayload) {
    const isLast = this._subscriptions.remove(request);
    const { player } = this;
    if (!player || !isLast) {
      return;
    }
    log.debug("unsubscribe", request);
    player.setSubscriptions(this._getExternalSubscriptions());
  }

  advertise(request: AdvertisePayload) {
    const isNew = this._publishers.add(request);
    const { player } = this;
    if (!player || !isNew) {
      return;
    }
    log.info("advertise", request);
    player.setPublishers(this.getAllExternalPublishers());
  }

  unadvertise(request: AdvertisePayload) {
    const isLast = this._publishers.remove(request);
    const { player } = this;
    if (!player || !isLast) {
      return;
    }
    log.info("unadvertise", request);
    player.setPublishers(this.getAllExternalPublishers());
  }

  publish(request: PublishPayload) {
    if (!this.getAllExternalPublishers().find(({ topic }) => topic === request.topic)) {
      throw new Error("Must first register a publisher before publishing");
    }

    const { player } = this;
    if (!player) {
      console.warn("Published when no player was available", request);
      return;
    }
    player.publish(request);
  }
}
