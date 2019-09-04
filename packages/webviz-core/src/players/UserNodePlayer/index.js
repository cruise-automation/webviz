// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import microMemoize from "micro-memoize";
import { TimeUtil, type Time } from "rosbag";

// $FlowFixMe - flow does not like workers.
import UserNodePlayerWorker from "worker-loader!webviz-core/src/players/UserNodePlayer/nodeRuntimeWorker"; // eslint-disable-line
// $FlowFixMe - flow does not like workers.
import NodeDataWorker from "worker-loader!webviz-core/src/players/UserNodePlayer/nodeTransformerWorker"; // eslint-disable-line

import { type SetNodeDiagnostics } from "webviz-core/src/actions/nodeDiagnostics";
import type {
  AdvertisePayload,
  Message,
  Player,
  PlayerState,
  PublishPayload,
  SubscribePayload,
  PlayerStateActiveData,
  Topic,
} from "webviz-core/src/players/types";
import { DiagnosticSeverity, type NodeData, type NodeRegistration } from "webviz-core/src/players/UserNodePlayer/types";
import type { UserNodes } from "webviz-core/src/types/panels";
import Rpc from "webviz-core/src/util/Rpc";
import signal from "webviz-core/src/util/signal";

// TODO: FUTURE - Performance tests
// TODO: FUTURE - Consider how to incorporate with existing hardcoded nodes (esp re: stories/testing)
// 1 - Do we convert them all over to the new node format / Typescript? What about imported libraries?
// 2 - Do we keep them in the old format for a while and support both formats?
export default class UserNodePlayer implements Player {
  _player: Player;
  _nodeRegistrations: NodeRegistration[] = [];
  _subscriptions: SubscribePayload[] = [];
  _lastSeekTime: ?number;
  _userNodes: UserNodes = {};
  // TODO: FUTURE - Terminate unused workers (some sort of timeout, for whole array or per rpc)
  // Not sure if there is perf issue with unused workers (may just go idle) - requires more research
  _unusedNodeRuntimeWorkers: Rpc[] = [];
  _lastPlayerStateActiveData: ?PlayerStateActiveData;
  _setUserNodeState: SetNodeDiagnostics;
  _nodeTransformWorker: Rpc = new Rpc(new NodeDataWorker());

  constructor(player: Player, setNodeDiagnostics: SetNodeDiagnostics) {
    this._player = player;
    this._setUserNodeState = setNodeDiagnostics;
  }

  // Called when userNode state is updated.
  setUserNodes(userNodes: UserNodes) {
    this._userNodes = userNodes;

    // TOOD: Currently the below causes us to reset workers twice, since we are
    // forcing a 'seek' here.
    this._resetWorkers().then(() => {
      const currentTime = this._lastPlayerStateActiveData && this._lastPlayerStateActiveData.currentTime;
      const isPlaying = this._lastPlayerStateActiveData && this._lastPlayerStateActiveData.isPlaying;
      if (!currentTime || isPlaying) {
        return;
      }
      this._player.seekPlayback(currentTime);
    });
  }

  // Defines the inputs/outputs and worker interface of a user node.
  _getNodeRegistration(nodeData: NodeData): NodeRegistration {
    const { inputTopics, outputTopic, transpiledCode: nodeCode } = nodeData;
    let rpc;
    const terminateSignal = signal<void>();
    return {
      inputs: inputTopics,
      output: { name: outputTopic, datatype: "std_msgs/Header" }, // TODO: TYPESCRIPT - extract datatype from Typescript
      processMessage: async (message: Message) => {
        if (!rpc) {
          rpc = this._unusedNodeRuntimeWorkers.pop() || new Rpc(new UserNodePlayerWorker());
          await rpc.send("registerNode", { nodeCode });
        }

        // TODO: FUTURE - surface runtime errors / infinite loop errors
        const newMessage: ?Message = await Promise.race([rpc.send("processMessage", { message }), terminateSignal]);
        if (!newMessage) {
          return;
        }
        return {
          topic: outputTopic,
          datatype: "std_msgs/Header", // TODO: TYPESCRIPT - extract datatype from Typescript
          op: "message",
          message: newMessage,
          receiveTime: message.receiveTime,
        };
      },
      terminate: () => {
        terminateSignal.resolve();
        if (rpc) {
          this._unusedNodeRuntimeWorkers.push(rpc);
          rpc = undefined;
        }
      },
    };
  }

  // We need to reset workers in a variety of circumstances:
  // - When a user node is updated, added or deleted
  // - When we seek (in order to reset state)
  // - When a new child player is added
  //
  // For the time being, resetWorkers is a catchall for these circumstances. As
  // performance bottlenecks are identified, it will be subject to change.
  async _resetWorkers() {
    for (const nodeRegistration of this._nodeRegistrations) {
      nodeRegistration.terminate();
    }

    const nodeRegistrations: NodeRegistration[] = [];
    for (const [nodeName, code] of Object.entries(this._userNodes)) {
      const sourceCode = ((code: any): string);
      const { topics = [], datatypes = {} } = this._lastPlayerStateActiveData || {};
      const nodeData = await this._nodeTransformWorker.send("transform", {
        name: nodeName,
        sourceCode,
        playerInfo: { topics, datatypes },
        priorRegistrations: nodeRegistrations,
      });
      const { diagnostics } = nodeData;

      this._setUserNodeState({ [nodeName]: { diagnostics } });
      if (diagnostics.some(({ severity }) => severity === DiagnosticSeverity.Error)) {
        continue;
      }
      nodeRegistrations.push(this._getNodeRegistration(nodeData));
    }

    this._nodeRegistrations = nodeRegistrations;
  }

  setListener(listener: (PlayerState) => Promise<void>) {
    this._player.setListener(async (playerState: PlayerState) => {
      if (playerState.activeData) {
        const { lastSeekTime, messages, topics } = playerState.activeData;
        this._lastSeekTime = lastSeekTime;

        // For resetting node state after seeking.
        // TODO: Make resetWorkers more efficient in this case since we don't
        // need to recompile/validate anything.
        if (
          this._lastPlayerStateActiveData &&
          playerState.activeData.lastSeekTime !== this._lastPlayerStateActiveData.lastSeekTime
        ) {
          await this._resetWorkers();
        }
        // If we do not have active player data from a previous call, then our
        // player just spun up, meaning we should re-run our user nodes in case
        // they have inputs that now exist in the current player context.
        if (!this._lastPlayerStateActiveData) {
          this._lastPlayerStateActiveData = playerState.activeData;
          await this._resetWorkers().then(() => {
            this.setSubscriptions(this._subscriptions);
          });
        }

        const promises = [];
        for (const message of messages) {
          for (const nodeRegistration of this._nodeRegistrations) {
            if (
              this._subscriptions.find(({ topic }) => topic === nodeRegistration.output.name) &&
              nodeRegistration.inputs.includes(message.topic)
            ) {
              promises.push(nodeRegistration.processMessage(message));
            }
          }
        }

        const nodeMessages: Message[] = (await Promise.all(promises)).filter(Boolean);
        const newPlayerState = {
          ...playerState,
          activeData: {
            ...playerState.activeData,
            messages: [...messages, ...nodeMessages].sort((a, b) => TimeUtil.compare(a.receiveTime, b.receiveTime)),
            topics: this._getTopics(topics, this._nodeRegistrations),
          },
        };

        this._lastPlayerStateActiveData = playerState.activeData;

        return listener(newPlayerState);
      }

      return listener(playerState);
    });
  }

  setSubscriptions(subscriptions: SubscribePayload[]) {
    this._subscriptions = subscriptions;

    const realTopicSubscriptions: SubscribePayload[] = [];
    for (const subscription of subscriptions) {
      const nodeRegistration = this._nodeRegistrations.find((info) => info.output.name === subscription.topic);
      if (nodeRegistration) {
        for (const inputTopic of nodeRegistration.inputs) {
          realTopicSubscriptions.push({
            topic: inputTopic,
            requester: { type: "node", name: nodeRegistration.output.name },
          });
        }
      } else {
        realTopicSubscriptions.push(subscription);
      }
    }

    this._player.setSubscriptions(realTopicSubscriptions);
  }

  close = () => {
    for (const nodeRegistration of this._nodeRegistrations) {
      nodeRegistration.terminate();
    }
    this._player.close();
  };

  setPublishers = (publishers: AdvertisePayload[]) => this._player.setPublishers(publishers);
  publish = (request: PublishPayload) => this._player.publish(request);
  startPlayback = () => this._player.startPlayback();
  pausePlayback = () => this._player.pausePlayback();
  setPlaybackSpeed = (speed: number) => this._player.setPlaybackSpeed(speed);
  seekPlayback = (time: Time) => this._player.seekPlayback(time);

  _getTopics = microMemoize((topics: Topic[], nodeRegistrations: NodeRegistration[]) => [
    ...topics,
    ...nodeRegistrations.map((nodeRegistration) => nodeRegistration.output),
  ]);
}
