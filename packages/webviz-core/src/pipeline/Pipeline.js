// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import omit from "lodash/omit";

import defaultNodeManager from "./defaultNodeManager";
import DataSourceDispatcher from "webviz-core/src/pipeline/DataSourceDispatcher";
import Multiset from "webviz-core/src/pipeline/Multiset";
import NodeManager from "webviz-core/src/pipeline/NodeManager";
import type {
  DataSource,
  Message,
  SubscribePayload,
  AdvertisePayload,
  PublishPayload,
  DataSourceMessage,
  TopicsMessage,
} from "webviz-core/src/types/dataSources";
import type { Dispatch } from "webviz-core/src/types/Store";
import Logger from "webviz-core/src/util/Logger";

const log = new Logger(__filename);

function subscriptionsEqual(a: SubscribePayload, b: SubscribePayload) {
  return a.topic === b.topic && a.encoding === b.encoding && a.scale === b.scale;
}

function publishersEqual(a: AdvertisePayload, b: AdvertisePayload) {
  return a.topic === b.topic && a.datatype === b.datatype;
}

// don't send requester info to data sources
function sanitizeSubscribe(payload: SubscribePayload): SubscribePayload {
  return omit(payload, "requester");
}
function sanitizeAdvertise(payload: AdvertisePayload): AdvertisePayload {
  return omit(payload, "advertiser");
}

// manages subscript/unsubscription of topics
// and pushes messages from external topics through webviz nodes
// and into the data source dispatcher
export default class Pipeline {
  dispatcher: ?DataSourceDispatcher;
  dataSource: ?DataSource;
  _nodeManager: NodeManager;
  _externalTopics: {| datatype: ?string, topic: string |}[] = [];
  _internalSubscriptions: Multiset<SubscribePayload> = new Multiset(subscriptionsEqual);
  _externalSubscriptions: Multiset<SubscribePayload> = new Multiset(subscriptionsEqual);
  _publishers: Multiset<AdvertisePayload> = new Multiset(publishersEqual);

  // support nodeManager injection for tests
  constructor(nodeManager: NodeManager = defaultNodeManager) {
    this._nodeManager = nodeManager;
  }

  getAllSubscriptions() {
    return [...this._externalSubscriptions.allItems(), ...this._internalSubscriptions.allItems()];
  }

  getUniqueExternalSubscriptions() {
    return this._externalSubscriptions.uniqueItems();
  }

  getUniqueInternalSubscriptions() {
    return this._internalSubscriptions.uniqueItems();
  }

  getAllExternalPublishers() {
    return this._publishers.allItems();
  }

  getUniqueExternalPublishers() {
    return this._publishers.uniqueItems();
  }

  // initialize the pipeline with a redux dispatcher and an external dataSource
  // you should call this again whenever the dataSource changes
  async initialize(dispatch: Dispatch, dataSource: DataSource) {
    this.dispatcher = new DataSourceDispatcher(dispatch);

    this.dispatcher.setReadyForMore(() => {
      if (this.dataSource) {
        this.dataSource.requestMessages();
      }
    });

    // set a listener on the node manager for messages webviz nodes publish
    // when they're published, push them into the dispatcher so they're added to the next frame
    this._nodeManager.resetNodeStates();
    this._nodeManager.setListener((msg: Message) => {
      if (!this.dispatcher) {
        log.error("Could not consume webviz node message. Dispatcher is null");
        return;
      }
      this.dispatcher.consumeMessage(msg);
    });

    // wait for the listener to be set, indicating the data source is connected
    // and ready to start emitting messages
    await dataSource.setListener((msg: DataSourceMessage) => {
      this._nodeManager.consume(msg);

      // append webviz node topics to the datasource topic list
      if (msg.op === "topics") {
        this._externalTopics = msg.topics || [];
        return this._publishAllTopics();
      }
      if (!this.dispatcher) {
        log.error("Could not consume message. Dispatcher is null");
        return Promise.resolve();
      }
      if (msg.op === "datatypes") {
        return this.dispatcher.consumeMessage({
          op: "datatypes",
          datatypes: { ...this._nodeManager.datatypes, ...msg.datatypes },
        });
      }
      return this.dispatcher.consumeMessage(msg);
    });

    this.dataSource = dataSource;

    // ensure any pending subscriptions are established once the datasource is connected
    this.getUniqueExternalSubscriptions().forEach((request) => {
      log.debug("subscribe", request);
      dataSource.subscribe(sanitizeSubscribe(request));
    });
    this.getUniqueExternalPublishers().forEach((request) => {
      log.debug("advertise", request);
      dataSource.advertise(sanitizeAdvertise(request));
    });
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
        ...this._nodeManager.getAllOutputs().map(({ datatype, name }) => ({
          datatype,
          topic: name,
        })),
      ],
    };
    return dispatcher.consumeMessage(msg);
  }

  _subscribeToInternalTopics(request: SubscribePayload) {
    this._internalSubscriptions.add(request);

    // Represents any nested internal dependencies that these nodes may have
    const newSubscribePayload = this._nodeManager.updateInternalSubscriptions(
      this._internalSubscriptions.uniqueItems()
    );
    newSubscribePayload.forEach((subscribePayload) => {
      this._internalSubscriptions.add(subscribePayload);
    });
  }

  _unsubscribeFromInternalTopics(request: SubscribePayload) {
    const toUnsubscribe: SubscribePayload[] = this._nodeManager.getInternalSubscriptionsFor(request.topic);
    this._internalSubscriptions.remove(request);
    toUnsubscribe.forEach((item) => {
      this._internalSubscriptions.remove(item);
    });

    this._nodeManager.updateInternalSubscriptions(this._internalSubscriptions.uniqueItems());
  }

  // subscribes to all dependent external topics and internal nodes for a given webviz node subscription request
  _subscribeToNode(request: SubscribePayload) {
    this._subscribeToInternalTopics(request);

    const externalSubs = this._nodeManager.getExternalSubscriptionsFor(request.topic);
    for (const sub of externalSubs) {
      this._subscribeToExternalTopic(sub);
    }
  }

  // unsubscribes from all external topics and internal nodes for a given webviz node unsubscribe request
  _unsubscribeFromNode(request: SubscribePayload) {
    const externalSubs = this._nodeManager.getExternalSubscriptionsFor(request.topic);
    this._unsubscribeFromInternalTopics(request);

    for (const sub of externalSubs) {
      this._unsubscribeFromExternalTopic(sub);
    }
  }

  // subscribe once and only once to a given external topic
  // also queues the subscription request if a datasource is not present
  // so it can be auto-subscribed in the future when the datasource becomes available
  _subscribeToExternalTopic(request: SubscribePayload) {
    const isNew = this._externalSubscriptions.add(request);
    const { dataSource } = this;
    if (!dataSource || !isNew) {
      return;
    }
    log.debug("subscribe", request);
    dataSource.subscribe(sanitizeSubscribe(request));
  }

  // unsubscribe only if there are 0 other subscriptions outstanding to an external topic
  _unsubscribeFromExternalTopic(request: SubscribePayload) {
    const isLast = this._externalSubscriptions.remove(request);
    const { dataSource } = this;
    if (!dataSource || !isLast) {
      return;
    }
    log.debug("unsubscribe", request);
    dataSource.unsubscribe(sanitizeSubscribe(request));
  }

  // subscribe to a topic - either an external topic or webviz node
  subscribe(request: SubscribePayload) {
    if (!this._nodeManager.isInternalTopic(request.topic)) {
      this._subscribeToExternalTopic(request);
    } else {
      this._subscribeToNode(request);
    }
  }

  // unsubscribe from a topic - either an external topic or webviz node
  unsubscribe(request: SubscribePayload) {
    if (!this._nodeManager.isInternalTopic(request.topic)) {
      this._unsubscribeFromExternalTopic(request);
    } else {
      this._unsubscribeFromNode(request);
    }
  }

  advertise(request: AdvertisePayload) {
    const isNew = this._publishers.add(request);
    const { dataSource } = this;
    if (!dataSource || !isNew) {
      return;
    }
    log.info("advertise", request);
    dataSource.advertise(sanitizeAdvertise(request));
  }

  unadvertise(request: AdvertisePayload) {
    const isLast = this._publishers.remove(request);
    const { dataSource } = this;
    if (!dataSource || !isLast) {
      return;
    }
    log.info("unadvertise", request);
    dataSource.unadvertise(sanitizeAdvertise(request));
  }

  publish(request: PublishPayload) {
    if (this._nodeManager.isInternalTopic(request.topic)) {
      throw new Error("Publishing internal topics is not supported");
    }

    const { dataSource } = this;
    if (!dataSource) {
      console.warn("Published when no data source was available", request);
      return;
    }
    dataSource.publish(request);
  }
}
