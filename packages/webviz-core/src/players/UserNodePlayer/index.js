// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { isEqual } from "lodash";
import microMemoize from "micro-memoize";
import { TimeUtil, type Time } from "rosbag";
import uuid from "uuid";

// Filename of nodeTransformerWorker is recognized by the server, and given a special header to
// ensure user-supplied code cannot make network requests.
// $FlowFixMe - flow does not like workers.
import NodeDataWorker from "sharedworker-loader?name=nodeTransformerWorker-[hash].[ext]!webviz-core/src/players/UserNodePlayer/nodeTransformerWorker"; // eslint-disable-line
import signal from "webviz-core/shared/signal";
import type {
  SetUserNodeDiagnostics,
  AddUserNodeLogs,
  SetUserNodeTrust,
  SetUserNodeRosLib,
} from "webviz-core/src/actions/userNodes";
// $FlowFixMe - flow does not like workers.
import UserNodePlayerWorker from "sharedworker-loader?name=nodeRuntimeWorker-[hash].[ext]!webviz-core/src/players/UserNodePlayer/nodeRuntimeWorker"; // eslint-disable-line

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
import { isUserNodeTrusted } from "webviz-core/src/players/UserNodePlayer/nodeSecurity";
import {
  type Diagnostic,
  DiagnosticSeverity,
  ErrorCodes,
  type NodeData,
  type NodeRegistration,
  type ProcessMessageOutput,
  type RegistrationOutput,
  Sources,
  type UserNodeLog,
} from "webviz-core/src/players/UserNodePlayer/types";
import type { UserNodes } from "webviz-core/src/types/panels";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";
import { DEFAULT_WEBVIZ_NODE_PREFIX } from "webviz-core/src/util/globalConstants";
import Rpc from "webviz-core/src/util/Rpc";
import { setupReceiveReportErrorHandler } from "webviz-core/src/util/RpcUtils";

type UserNodeActions = {
  setUserNodeDiagnostics: SetUserNodeDiagnostics,
  addUserNodeLogs: AddUserNodeLogs,
  setUserNodeTrust: SetUserNodeTrust,
  setUserNodeRosLib: SetUserNodeRosLib,
};

const rpcFromNewSharedWorker = (worker) => {
  const port: MessagePort = worker.port;
  port.start();
  const rpc = new Rpc(port);
  setupReceiveReportErrorHandler(rpc);
  return rpc;
};

// TODO: FUTURE - Performance tests
// TODO: FUTURE - Consider how to incorporate with existing hardcoded nodes (esp re: stories/testing)
// 1 - Do we convert them all over to the new node format / Typescript? What about imported libraries?
// 2 - Do we keep them in the old format for a while and support both formats?
export default class UserNodePlayer implements Player {
  _player: Player;
  _nodeRegistrations: NodeRegistration[] = [];
  _subscriptions: SubscribePayload[] = [];
  _userNodes: UserNodes = {};
  // TODO: FUTURE - Terminate unused workers (some sort of timeout, for whole array or per rpc)
  // Not sure if there is perf issue with unused workers (may just go idle) - requires more research
  _unusedNodeRuntimeWorkers: Rpc[] = [];
  _lastPlayerStateActiveData: ?PlayerStateActiveData;
  _setUserNodeDiagnostics: (nodeId: string, diagnostics: Diagnostic[]) => void;
  _addUserNodeLogs: (nodeId: string, logs: UserNodeLog[]) => void;
  _setNodeTrust: (nodeId: string, trusted: boolean) => void;
  _setRosLib: (rosLib: string) => void;
  _nodeTransformRpc: ?Rpc = null;
  _userDatatypes: RosDatatypes = {};
  _bagDatatypes: RosDatatypes = {};
  _rosLib: ?string;
  _pendingResetWorkers: ?Promise<void>;

  constructor(player: Player, userNodeActions: UserNodeActions) {
    this._player = player;
    const { setUserNodeDiagnostics, addUserNodeLogs, setUserNodeTrust, setUserNodeRosLib } = userNodeActions;

    // TODO(troy): can we make the below action flow better? Might be better to
    // just add an id, and the thing you want to update? Instead of passing in
    // objects?
    this._setUserNodeDiagnostics = (nodeId: string, diagnostics: Diagnostic[]) => {
      setUserNodeDiagnostics({ [nodeId]: { diagnostics } });
    };
    this._addUserNodeLogs = (nodeId: string, logs: UserNodeLog[]) => {
      if (logs.length) {
        addUserNodeLogs({ [nodeId]: { logs } });
      }
    };

    this._setNodeTrust = (id: string, trusted: boolean) => {
      setUserNodeTrust({ id, trusted });
    };

    this._setRosLib = (rosLib: string) => {
      this._rosLib = rosLib;
      // We set this in Redux as the monaco editor needs to refer to it.
      setUserNodeRosLib(rosLib);
    };
  }

  _getTopics = microMemoize((topics: Topic[], nodeTopics: Topic[]) => [...topics, ...nodeTopics], { isEqual });
  _getDatatypes = microMemoize((datatypes, userDatatypes) => ({ ...userDatatypes, ...datatypes }), { isEqual });

  // When updating Webviz nodes while paused, we seek to the current time
  // (i.e. invoke _getMessages with an empty array) to refresh messages
  _getMessages = microMemoize(
    async (messages: Message[]): Promise<Message[]> => {
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
      return [...messages, ...nodeMessages].sort((a, b) => TimeUtil.compare(a.receiveTime, b.receiveTime));
    }
  );

  // Called when userNode state is updated.
  async setUserNodes(userNodes: UserNodes): Promise<void> {
    this._userNodes = userNodes;

    if (!this._lastPlayerStateActiveData) {
      return;
    }

    const { topics, datatypes } = this._lastPlayerStateActiveData;

    // TODO: Currently the below causes us to reset workers twice, since we are
    // forcing a 'seek' here.
    return this._resetWorkers(topics, datatypes).then(() => {
      this.setSubscriptions(this._subscriptions);
      const currentTime = this._lastPlayerStateActiveData && this._lastPlayerStateActiveData.currentTime;
      const isPlaying = this._lastPlayerStateActiveData && this._lastPlayerStateActiveData.isPlaying;
      if (!currentTime || isPlaying) {
        return;
      }
      this._player.seekPlayback(currentTime);
    });
  }

  // Defines the inputs/outputs and worker interface of a user node.
  _getNodeRegistration(nodeId: string, nodeData: NodeData): NodeRegistration {
    const { inputTopics, outputTopic, transpiledCode: nodeCode, projectCode, outputDatatype, datatypes } = nodeData;
    // Update datatypes for the player state to consume.
    this._userDatatypes = { ...this._userDatatypes, ...datatypes };
    let rpc;
    const terminateSignal = signal<void>();
    return {
      inputs: inputTopics,
      output: { name: outputTopic, datatype: outputDatatype },
      processMessage: async (message: Message) => {
        // Register the node within a web worker to be executed.
        if (!rpc) {
          rpc = this._unusedNodeRuntimeWorkers.pop() || rpcFromNewSharedWorker(new UserNodePlayerWorker(uuid.v4()));
          const { error, userNodeDiagnostics, userNodeLogs } = await rpc.send<RegistrationOutput>("registerNode", {
            nodeCode,
            projectCode,
          });
          if (error) {
            this._setUserNodeDiagnostics(nodeId, [
              ...userNodeDiagnostics,
              {
                source: Sources.Runtime,
                severity: DiagnosticSeverity.Error,
                message: error,
                code: ErrorCodes.RUNTIME,
              },
            ]);
            return;
          }
          this._addUserNodeLogs(nodeId, userNodeLogs);
        }

        const result = await Promise.race([
          rpc.send<ProcessMessageOutput>("processMessage", { message }),
          terminateSignal,
        ]);

        if (result && result.error) {
          this._setUserNodeDiagnostics(nodeId, [
            {
              source: Sources.Runtime,
              severity: DiagnosticSeverity.Error,
              message: result.error,
              code: ErrorCodes.RUNTIME,
            },
          ]);
          return;
        }

        if (result) {
          this._addUserNodeLogs(nodeId, result.userNodeLogs);
        }

        // TODO: FUTURE - surface runtime errors / infinite loop errors
        if (!result || !result.message) {
          return;
        }
        return {
          topic: outputTopic,
          receiveTime: message.receiveTime,
          message: result.message,
        };
      },
      terminate: () => {
        terminateSignal.resolve();
        if (rpc) {
          this._unusedNodeRuntimeWorkers.push(rpc);
        }
      },
    };
  }

  _getTransformWorker(): Rpc {
    if (!this._nodeTransformRpc) {
      this._nodeTransformRpc = rpcFromNewSharedWorker(new NodeDataWorker(uuid.v4()));
    }
    return this._nodeTransformRpc;
  }

  // We need to reset workers in a variety of circumstances:
  // - When a user node is updated, added or deleted
  // - When we seek (in order to reset state)
  // - When a new child player is added
  //
  // For the time being, resetWorkers is a catchall for these circumstances. As
  // performance bottlenecks are identified, it will be subject to change.
  async _resetWorkers(topics: Topic[], datatypes: RosDatatypes) {
    // Make sure that we only run this function once at a time, but using this instead of `debouncePromise` so that it
    // returns a promise.
    if (this._pendingResetWorkers) {
      await this._pendingResetWorkers;
    }
    const pending = signal();
    this._pendingResetWorkers = pending;

    // This early return is an optimization measure so that the
    // `nodeRegistrations` array is not re-defined, which will invalidate
    // downstream caches. (i.e. `this._getTopics`)
    if (!this._nodeRegistrations.length && !Object.entries(this._userNodes).length) {
      pending.resolve();
      this._pendingResetWorkers = null;
      return;
    }

    for (const nodeRegistration of this._nodeRegistrations) {
      nodeRegistration.terminate();
    }

    const rosLib = await this._getRosLib(topics, datatypes);

    const nodeRegistrations: NodeRegistration[] = [];
    for (const [nodeId, nodeObj] of Object.entries(this._userNodes)) {
      const node = ((nodeObj: any): { name: string, sourceCode: string });
      const isTrusted = await isUserNodeTrusted({ id: nodeId, sourceCode: node.sourceCode });
      if (!isTrusted) {
        this._setNodeTrust(nodeId, false);
        continue;
      } else {
        this._setNodeTrust(nodeId, true);
      }

      const transformWorker = this._getTransformWorker();
      const nodeData = await transformWorker.send("transform", {
        name: node.name,
        sourceCode: node.sourceCode,
        playerInfo: { topics, playerDatatypes: datatypes },
        priorRegisteredTopics: nodeRegistrations.map(({ output }) => output),
        rosLib,
        datatypes: this._bagDatatypes,
      });
      const { diagnostics } = nodeData;
      this._setUserNodeDiagnostics(nodeId, diagnostics);
      if (diagnostics.some(({ severity }) => severity === DiagnosticSeverity.Error)) {
        continue;
      }
      nodeRegistrations.push(this._getNodeRegistration(nodeId, nodeData));
    }

    this._nodeRegistrations = nodeRegistrations;

    pending.resolve();
    this._pendingResetWorkers = null;
  }

  async _getRosLib(topics: Topic[], datatypes: RosDatatypes): Promise<string> {
    // We only generate the roslib once, because available topics and datatypes should never change. If they do, for
    // a source or player change, we destroy this player and create a new one.
    if (this._rosLib) {
      return this._rosLib;
    }

    const transformWorker = this._getTransformWorker();
    const rosLib = await transformWorker.send("generateRosLib", {
      topics,
      datatypes,
    });
    this._setRosLib(rosLib);

    return rosLib;
  }

  setListener(listener: (PlayerState) => Promise<void>) {
    this._player.setListener(async (playerState: PlayerState) => {
      const { activeData } = playerState;
      if (activeData) {
        const { messages, topics, datatypes } = activeData;

        // For resetting node state after seeking.
        // TODO: Make resetWorkers more efficient in this case since we don't
        // need to recompile/validate anything.
        if (
          this._lastPlayerStateActiveData &&
          activeData.lastSeekTime !== this._lastPlayerStateActiveData.lastSeekTime
        ) {
          await this._resetWorkers(topics, datatypes);
        }
        // If we do not have active player data from a previous call, then our
        // player just spun up, meaning we should re-run our user nodes in case
        // they have inputs that now exist in the current player context.
        if (!this._lastPlayerStateActiveData) {
          this._bagDatatypes = datatypes;
          this._lastPlayerStateActiveData = activeData;
          await this._resetWorkers(topics, datatypes);
          this.setSubscriptions(this._subscriptions);
          this.requestBackfill();
        }

        const newPlayerState = {
          ...playerState,
          activeData: {
            ...activeData,
            messages: await this._getMessages(messages),
            topics: this._getTopics(topics, this._nodeRegistrations.map((nodeRegistration) => nodeRegistration.output)),
            datatypes: this._getDatatypes(datatypes, this._userDatatypes),
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

    const mappedTopics: string[] = [];
    const realTopicSubscriptions: SubscribePayload[] = [];
    for (const subscription of subscriptions) {
      // For performance, only check topics that start with DEFAULT_WEBVIZ_NODE_PREFIX.
      if (!subscription.topic.startsWith(DEFAULT_WEBVIZ_NODE_PREFIX)) {
        realTopicSubscriptions.push(subscription);
        continue;
      }

      // When subscribing to the same node multiple times, only subscribe to the underlying
      // topics once. This is not strictly necessary, but it makes debugging a bit easier.
      if (mappedTopics.includes(subscription.topic)) {
        continue;
      }
      mappedTopics.push(subscription.topic);

      const nodeRegistration = this._nodeRegistrations.find((info) => info.output.name === subscription.topic);
      if (nodeRegistration) {
        for (const inputTopic of nodeRegistration.inputs) {
          realTopicSubscriptions.push({
            topic: inputTopic,
            requester: { type: "node", name: nodeRegistration.output.name },
          });
        }
      }
    }

    this._player.setSubscriptions(realTopicSubscriptions);
  }

  close = () => {
    for (const nodeRegistration of this._nodeRegistrations) {
      nodeRegistration.terminate();
    }
    this._player.close();
    if (this._nodeTransformRpc) {
      this._nodeTransformRpc.send("close");
    }
  };

  setPublishers = (publishers: AdvertisePayload[]) => this._player.setPublishers(publishers);
  publish = (request: PublishPayload) => this._player.publish(request);
  startPlayback = () => this._player.startPlayback();
  pausePlayback = () => this._player.pausePlayback();
  setPlaybackSpeed = (speed: number) => this._player.setPlaybackSpeed(speed);
  seekPlayback = (time: Time, backfillDuration: ?Time) => this._player.seekPlayback(time, backfillDuration);
  requestBackfill = () => this._player.requestBackfill();
}
