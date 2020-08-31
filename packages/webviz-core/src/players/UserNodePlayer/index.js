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
import type { SetUserNodeDiagnostics, AddUserNodeLogs, SetUserNodeRosLib } from "webviz-core/src/actions/userNodes";
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
  BobjectMessage,
} from "webviz-core/src/players/types";
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
import { wrapJsObject } from "webviz-core/src/util/binaryObjects";
import { basicDatatypes } from "webviz-core/src/util/datatypes";
import { DEFAULT_WEBVIZ_NODE_PREFIX } from "webviz-core/src/util/globalConstants";
import Rpc from "webviz-core/src/util/Rpc";
import { setupReceiveReportErrorHandler } from "webviz-core/src/util/RpcUtils";

type UserNodeActions = {|
  setUserNodeDiagnostics: SetUserNodeDiagnostics,
  addUserNodeLogs: AddUserNodeLogs,
  setUserNodeRosLib: SetUserNodeRosLib,
|};

const rpcFromNewSharedWorker = (worker) => {
  const port: MessagePort = worker.port;
  port.start();
  const rpc = new Rpc(port);
  setupReceiveReportErrorHandler(rpc);
  return rpc;
};

const getBobjectMessage = async (
  datatypes: RosDatatypes,
  datatype: string,
  messagePromise: Promise<?Message>
): Promise<?BobjectMessage> => {
  const msg = await messagePromise;
  if (!msg) {
    return null;
  }
  return {
    topic: msg.topic,
    receiveTime: msg.receiveTime,
    message: wrapJsObject(datatypes, datatype, msg.message),
  };
};

// TODO: FUTURE - Performance tests
// TODO: FUTURE - Consider how to incorporate with existing hardcoded nodes (esp re: stories/testing)
// 1 - Do we convert them all over to the new node format / Typescript? What about imported libraries?
// 2 - Do we keep them in the old format for a while and support both formats?
export default class UserNodePlayer implements Player {
  _player: Player;
  _nodeRegistrations: NodeRegistration[] = [];
  _subscriptions: SubscribePayload[] = [];
  _subscribedFormatByTopic: { [topic: string]: Set<"parsedMessages" | "bobjects"> } = {};
  _userNodes: UserNodes = {};
  // TODO: FUTURE - Terminate unused workers (some sort of timeout, for whole array or per rpc)
  // Not sure if there is perf issue with unused workers (may just go idle) - requires more research
  _unusedNodeRuntimeWorkers: Rpc[] = [];
  _lastPlayerStateActiveData: ?PlayerStateActiveData;
  _setUserNodeDiagnostics: (nodeId: string, diagnostics: Diagnostic[]) => void;
  _addUserNodeLogs: (nodeId: string, logs: UserNodeLog[]) => void;
  _setRosLib: (rosLib: string) => void;
  _nodeTransformRpc: ?Rpc = null;
  // Always start with a set of basic datatypes that we know how to render. These could be overwritten later by bag
  // datatypes, but these datatype definitions are very stable.
  _userDatatypes: RosDatatypes = { ...basicDatatypes };
  _rosLib: ?string;
  _pendingResetWorkers: ?Promise<void>;

  constructor(player: Player, userNodeActions: UserNodeActions) {
    this._player = player;
    const { setUserNodeDiagnostics, addUserNodeLogs, setUserNodeRosLib } = userNodeActions;

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
    async (
      parsedMessages: Message[],
      bobjects: BobjectMessage[]
    ): Promise<{ parsedMessages: $ReadOnlyArray<Message>, bobjects: $ReadOnlyArray<BobjectMessage> }> => {
      const parsedMessagesPromises = [];
      const bobjectPromises = [];
      for (const message of parsedMessages) {
        for (const nodeRegistration of this._nodeRegistrations) {
          const subscriptions = this._subscribedFormatByTopic[nodeRegistration.output.name];
          if (subscriptions && nodeRegistration.inputs.includes(message.topic)) {
            const messagePromise = nodeRegistration.processMessage(message);
            // There should be at most 2 subscriptions.
            for (const format of subscriptions.values()) {
              if (format === "parsedMessages") {
                parsedMessagesPromises.push(messagePromise);
              } else {
                bobjectPromises.push(
                  getBobjectMessage(this._userDatatypes, nodeRegistration.output.datatype, messagePromise)
                );
              }
            }
          }
        }
      }
      const [nodeParsedMessages, nodeBobjects] = await Promise.all([
        (await Promise.all(parsedMessagesPromises)).filter(Boolean),
        (await Promise.all(bobjectPromises)).filter(Boolean),
      ]);

      return {
        parsedMessages: parsedMessages
          .concat(nodeParsedMessages)
          .sort((a, b) => TimeUtil.compare(a.receiveTime, b.receiveTime)),
        bobjects: bobjects.concat(nodeBobjects).sort((a, b) => TimeUtil.compare(a.receiveTime, b.receiveTime)),
      };
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

      const transformWorker = this._getTransformWorker();
      const nodeData = await transformWorker.send("transform", {
        name: node.name,
        sourceCode: node.sourceCode,
        topics,
        priorRegisteredTopics: nodeRegistrations.map(({ output }) => output),
        rosLib,
        // Pass all the nodes a set of basic datatypes that we know how to render. These could be overwritten later by
        // bag datatypes, but these datatype definitions should be very stable.
        datatypes: { ...basicDatatypes, ...datatypes },
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
        const { messages, topics, datatypes, bobjects } = activeData;

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
          this._lastPlayerStateActiveData = activeData;
          await this._resetWorkers(topics, datatypes);
          this.setSubscriptions(this._subscriptions);
          this.requestBackfill();
        }

        const { parsedMessages, bobjects: augmentedBobjects } = await this._getMessages(messages, bobjects);

        const newPlayerState = {
          ...playerState,
          activeData: {
            ...activeData,
            messages: parsedMessages,
            bobjects: augmentedBobjects,
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
    const nodeSubscriptions: SubscribePayload[] = [];
    for (const subscription of subscriptions) {
      // For performance, only check topics that start with DEFAULT_WEBVIZ_NODE_PREFIX.
      if (!subscription.topic.startsWith(DEFAULT_WEBVIZ_NODE_PREFIX)) {
        realTopicSubscriptions.push(subscription);
        continue;
      }

      nodeSubscriptions.push(subscription);

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
            // User nodes won't understand bobjects.
            format: "parsedMessages",
          });
        }
      }
    }

    const subscribedFormatByTopic = {};
    for (const { topic, format } of nodeSubscriptions) {
      subscribedFormatByTopic[topic] = subscribedFormatByTopic[topic] || new Set();
      subscribedFormatByTopic[topic].add(format);
    }
    this._subscribedFormatByTopic = subscribedFormatByTopic;

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
