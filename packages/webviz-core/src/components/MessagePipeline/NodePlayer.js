// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { flatten } from "lodash";
import microMemoize from "micro-memoize";
import type { Time } from "rosbag";

import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import {
  type NodeDefinition,
  applyNodesToMessages,
  isWebvizNodeTopic,
  getNodeSubscriptions,
  validateNodeDefinitions,
} from "webviz-core/src/pipeline/nodes";
import type {
  AdvertisePayload,
  PlayerState,
  PublishPayload,
  SubscribePayload,
  Player,
  Topic,
} from "webviz-core/src/types/players";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";

export default class NodePlayer implements Player {
  _player: Player;
  _nodeDefinitions: NodeDefinition<any>[];
  _nodeStates: any[];
  _originalNodeStates: any[];
  _lastSeekTime: number = 0;

  constructor(player: Player, nodeDefinitions: NodeDefinition<any>[] = getGlobalHooks().nodes()) {
    validateNodeDefinitions(nodeDefinitions);
    this._player = player;
    this._nodeDefinitions = nodeDefinitions;
    this._nodeStates = this._originalNodeStates = this._nodeDefinitions.map((def) => def.defaultState);
  }

  _getTopics = microMemoize((topics: Topic[]) => [
    ...topics,
    ...flatten(this._nodeDefinitions.map((nodeDefinition) => nodeDefinition.outputs)).map(({ datatype, name }) => ({
      name,
      datatype,
    })),
  ]);

  _getDatatypes = microMemoize((datatypes: RosDatatypes) => {
    let newDatatypes = { ...datatypes };
    for (const nodeDefinition of this._nodeDefinitions) {
      newDatatypes = { ...nodeDefinition.datatypes, ...newDatatypes };
    }
    return newDatatypes;
  });

  setListener(listener: (PlayerState) => Promise<void>) {
    this._player.setListener((playerState: PlayerState) => {
      if (!playerState.activeData || playerState.activeData.lastSeekTime !== this._lastSeekTime) {
        this._nodeStates = this._originalNodeStates;
      }

      if (playerState.activeData) {
        const { lastSeekTime, topics, datatypes } = playerState.activeData;

        const { states, messages } = applyNodesToMessages(
          this._nodeDefinitions,
          playerState.activeData.messages,
          this._nodeStates
        );

        this._nodeStates = states;
        this._lastSeekTime = lastSeekTime;

        return listener({
          ...playerState,
          activeData: {
            ...playerState.activeData,
            messages,
            topics: this._getTopics(topics),
            datatypes: this._getDatatypes(datatypes),
          },
        });
      }

      return listener(playerState);
    });
  }

  setSubscriptions(subscriptions: SubscribePayload[]) {
    const remoteSubscriptionsForNodes = getNodeSubscriptions(this._nodeDefinitions, subscriptions).filter(
      ({ topic }) => !isWebvizNodeTopic(topic)
    );
    this._player.setSubscriptions(remoteSubscriptionsForNodes);
  }

  close = () => this._player.close();
  setPublishers = (publishers: AdvertisePayload[]) => this._player.setPublishers(publishers);
  publish = (request: PublishPayload) => this._player.publish(request);
  startPlayback = () => this._player.startPlayback();
  pausePlayback = () => this._player.pausePlayback();
  setPlaybackSpeed = (speed: number) => this._player.setPlaybackSpeed(speed);
  seekPlayback = (time: Time) => this._player.seekPlayback(time);

  getUnderlyingPlayer() {
    if (process.env.NODE_ENV !== "test") {
      throw new Error("Only allowed to be used in tests.");
    }
    return this._player;
  }
}
