// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { partition, cloneDeep, uniqBy } from "lodash";
import microMemoize from "micro-memoize";
import type { Time } from "rosbag";

import type { GlobalVariables } from "webviz-core/src/hooks/useGlobalVariables";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import {
  type NodeDefinition,
  type NodeStates,
  applyNodesToMessages,
  partitionMessagesBySubscription,
  isWebvizNodeTopic,
  getNodeSubscriptions,
  validateNodeDefinitions,
  getDefaultNodeStates,
} from "webviz-core/src/players/nodes";
import type {
  AdvertisePayload,
  PlayerState,
  PublishPayload,
  SubscribePayload,
  Player,
  Topic,
} from "webviz-core/src/players/types";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";

export default class NodePlayer implements Player {
  _player: Player;
  _nodeDefinitions: NodeDefinition<*>[];
  _subscribedNodeDefinitions: NodeDefinition<*>[] = [];
  _nodeSubscriptions: SubscribePayload[] = [];
  _nodeStates: NodeStates = {};
  _originalNodeStates: NodeStates;
  _lastSeekTime: number = 0;

  constructor(player: Player, nodeDefinitions: NodeDefinition<any>[] = getGlobalHooks().nodes()) {
    validateNodeDefinitions(nodeDefinitions);
    this._player = player;
    this._nodeDefinitions = nodeDefinitions;
    const defaultNodeStates = getDefaultNodeStates(nodeDefinitions);

    this._nodeStates = defaultNodeStates;
    this._originalNodeStates = cloneDeep(defaultNodeStates);
  }

  _getTopics = microMemoize((availableTopics: Topic[]) => [
    ...availableTopics,
    ...this._getFilteredNodeDefinitions(availableTopics).map((nodeDefinition) => nodeDefinition.output),
  ]);

  _getDatatypes = microMemoize(
    (datatypes: RosDatatypes, availableTopics: Topic[]): string[] => {
      let newDatatypes = { ...datatypes };
      for (const nodeDefinition of this._getFilteredNodeDefinitions(availableTopics)) {
        // Note: We prefer the bag's definitions.
        newDatatypes = { ...nodeDefinition.datatypes, ...newDatatypes };
      }
      return newDatatypes;
    }
  );

  _getFilteredNodeDefinitions = microMemoize(
    (availableTopics: Topic[]): NodeDefinition<any>[] => {
      const availableTopicNamesSet = new Set(availableTopics.map((topic) => topic.name));
      // Filter out nodes that don't have available input topics.
      return this._nodeDefinitions.filter((nodeDef) =>
        nodeDef.inputs.some((inputTopic) => availableTopicNamesSet.has(inputTopic))
      );
    }
  );

  setListener(listener: (PlayerState) => Promise<void>) {
    this._player.setListener((playerState: PlayerState) => {
      if (!playerState.activeData || playerState.activeData.lastSeekTime !== this._lastSeekTime) {
        this._nodeStates = this._originalNodeStates;
      }

      if (playerState.activeData) {
        const {
          lastSeekTime,
          topics,
          datatypes: childDatatypes,
          messages: playerStateMessages,
          bobjects: playerStateBobjects,
        } = playerState.activeData;
        // Don't use _getFilteredNodeDefinitions here, since the _nodeDefinitions array needs to match up
        // with the _nodeStates array, and we're only calling the nodes for available topics in applyNodesToMessages
        // anyway.
        const datatypes = this._getDatatypes(childDatatypes, topics);

        const { states, messages } = applyNodesToMessages({
          nodeDefinitions: this._subscribedNodeDefinitions,
          originalMessages: playerStateMessages,
          originalBobjects: playerStateBobjects,
          states: this._nodeStates,
          datatypes,
        });

        const { parsedMessages, bobjects } = partitionMessagesBySubscription(
          messages,
          this._nodeSubscriptions,
          this._nodeDefinitions,
          datatypes
        );

        this._nodeStates = states;
        this._lastSeekTime = lastSeekTime;

        return listener({
          ...playerState,
          activeData: {
            ...playerState.activeData,
            messages: parsedMessages,
            bobjects,
            topics: this._getTopics(topics),
            datatypes,
          },
        });
      }

      return listener(playerState);
    });
  }

  setSubscriptions(subscriptions: SubscribePayload[]) {
    const [nodeSubscriptions, underlyingSubscriptions] = partition(subscriptions, ({ topic }) =>
      isWebvizNodeTopic(topic)
    );
    this._nodeSubscriptions = uniqBy(nodeSubscriptions, ({ topic, format }) => `${topic}${format}`);

    this._subscribedNodeDefinitions = uniqBy(nodeSubscriptions, "topic")
      .map((subscribePayload) => {
        return this._nodeDefinitions.find((def) => subscribePayload.topic === def.output.name);
      })
      .filter(Boolean);

    const underlyingSubscriptionsForNodes = getNodeSubscriptions(this._subscribedNodeDefinitions);

    this._player.setSubscriptions([...underlyingSubscriptions, ...underlyingSubscriptionsForNodes]);
  }

  close = () => this._player.close();
  setPublishers = (publishers: AdvertisePayload[]) => this._player.setPublishers(publishers);
  publish = (request: PublishPayload) => this._player.publish(request);
  startPlayback = () => this._player.startPlayback();
  pausePlayback = () => this._player.pausePlayback();
  setPlaybackSpeed = (speed: number) => this._player.setPlaybackSpeed(speed);
  seekPlayback = (time: Time, backfillDuration: ?Time) => this._player.seekPlayback(time, backfillDuration);
  requestBackfill = () => this._player.requestBackfill();
  // Will be deprecated once NodePlayer is merged into UserNodePlayer.
  setUserNodes = (_data: any) => {};
  getUnderlyingPlayer() {
    if (process.env.NODE_ENV !== "test") {
      throw new Error("Only allowed to be used in tests.");
    }
    return this._player;
  }

  setGlobalVariables(globalVariables: GlobalVariables) {
    this._player.setGlobalVariables(globalVariables);
  }
}
