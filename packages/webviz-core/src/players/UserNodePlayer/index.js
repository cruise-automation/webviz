// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { isEqual, groupBy, partition, flatten } from "lodash";
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
import { type GlobalVariables } from "webviz-core/src/hooks/useGlobalVariables";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import type {
  AdvertisePayload,
  Message,
  Player,
  PlayerState,
  PlayerStateActiveData,
  PublishPayload,
  SubscribePayload,
  Topic,
  BobjectMessage,
} from "webviz-core/src/players/types";
import {
  type Diagnostic,
  DiagnosticSeverity,
  ErrorCodes,
  type NodeRegistration,
  type ProcessMessagesOutput,
  type RegistrationOutput,
  Sources,
  type UserNodeLog,
  type NodeData,
} from "webviz-core/src/players/UserNodePlayer/types";
import { hasTransformerErrors } from "webviz-core/src/players/UserNodePlayer/utils";
import type { UserNode, UserNodes } from "webviz-core/src/types/panels";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";
import { deepParse, getObjects, isBobject, wrapJsObject } from "webviz-core/src/util/binaryObjects";
import { BobjectRpcSender } from "webviz-core/src/util/binaryObjects/BobjectRpc";
import { DEFAULT_WEBVIZ_NODE_PREFIX, $WEBVIZ_SOURCE_2 } from "webviz-core/src/util/globalConstants";
import Rpc from "webviz-core/src/util/Rpc";
import { setupMainThreadRpc } from "webviz-core/src/util/RpcMainThreadUtils";
import type { TimestampMethod } from "webviz-core/src/util/time";
import { addTopicPrefix, joinTopics } from "webviz-core/src/util/topicUtils";

type UserNodeActions = {|
  setUserNodeDiagnostics: SetUserNodeDiagnostics,
  addUserNodeLogs: AddUserNodeLogs,
  setUserNodeRosLib: SetUserNodeRosLib,
|};

const rpcFromNewSharedWorker = (worker) => {
  const port: MessagePort = worker.port;
  port.start();
  const rpc = new Rpc(port);
  setupMainThreadRpc(rpc);
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
  _rosLib: ?string;
  _globalVariables: GlobalVariables = {};
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
  _getDatatypes = microMemoize(
    (datatypes, nodeRegistrations: NodeRegistration[]) => {
      const userNodeDatatypes = nodeRegistrations.reduce(
        (allDatatypes, { nodeData }) => ({ ...allDatatypes, ...nodeData.datatypes }),
        {}
      );
      return { ...getGlobalHooks().getBasicDatatypes(), ...datatypes, ...userNodeDatatypes };
    },
    { isEqual }
  );
  _getNodeRegistration = microMemoize(this._createMultiSourceNodeRegistration, {
    isEqual,
    isPromise: true,
    maxSize: Infinity, // We prune the cache anytime the userNodes change, so it's not *actually* Infinite
  });

  // When updating Webviz nodes while paused, we seek to the current time
  // (i.e. invoke _getMessages with an empty array) to refresh messages
  _getMessages = microMemoize(
    async (
      parsedMessages: Message[],
      bobjects: BobjectMessage[],
      datatypes: RosDatatypes,
      globalVariables: GlobalVariables,
      nodeRegistrations: NodeRegistration[]
    ): Promise<{ parsedMessages: $ReadOnlyArray<Message>, bobjects: $ReadOnlyArray<BobjectMessage> }> => {
      const nodesToRun = new Map<NodeRegistration, Message[]>();
      for (const message of bobjects) {
        for (const nodeRegistration of nodeRegistrations) {
          const subscriptions = this._subscribedFormatByTopic[nodeRegistration.output.name];
          if (subscriptions && nodeRegistration.inputs.includes(message.topic)) {
            const nodeInputMessages = nodesToRun.get(nodeRegistration) ?? [];
            nodeInputMessages.push(message);
            nodesToRun.set(nodeRegistration, nodeInputMessages);
          }
        }
      }
      const nodeParsedMessages = [];
      const nodeBobjects = [];
      await Promise.all(
        [...nodesToRun].map(async ([node, nodeInputMessages]) => {
          const nodeMessages = await node.processMessages(nodeInputMessages, datatypes, globalVariables);
          // There should be at most 2 subscriptions -- parsed and/or bobject.
          const subscriptions = this._subscribedFormatByTopic[node.output.name];
          for (const format of subscriptions.values()) {
            if (format === "parsedMessages") {
              nodeMessages.forEach(({ message, topic, receiveTime }) => {
                const parsedMessage = isBobject(message)
                  ? { message: deepParse(message), topic, receiveTime }
                  : { message, topic, receiveTime };
                nodeParsedMessages.push(parsedMessage);
              });
            } else {
              nodeMessages.forEach(({ message, topic, receiveTime }) => {
                const bobject = isBobject(message)
                  ? { message, topic, receiveTime }
                  : {
                      topic,
                      receiveTime,
                      message: wrapJsObject(datatypes, node.output.datatype, message),
                    };
                nodeBobjects.push(bobject);
              });
            }
          }
        })
      );
      return {
        parsedMessages: parsedMessages
          .concat(nodeParsedMessages)
          .sort((a, b) => TimeUtil.compare(a.receiveTime, b.receiveTime)),
        bobjects: bobjects.concat(nodeBobjects).sort((a, b) => TimeUtil.compare(a.receiveTime, b.receiveTime)),
      };
    }
  );

  setGlobalVariables(globalVariables: GlobalVariables) {
    this._globalVariables = globalVariables;
  }

  // Called when userNode state is updated.
  async setUserNodes(userNodes: UserNodes): Promise<void> {
    this._userNodes = userNodes;

    // Prune the nodeDefinition cache so it doesn't grow forever.
    // We add one to the count so we don't have to recompile nodes if users undo/redo node changes.
    const maxNodeRegistrationCacheCount = Object.keys(userNodes).length + 1;
    this._getNodeRegistration.cache.keys.splice(maxNodeRegistrationCacheCount, Infinity);
    this._getNodeRegistration.cache.values.splice(maxNodeRegistrationCacheCount, Infinity);

    // This code causes us to reset workers twice because the forceSeek resets the workers too
    // TODO: Only reset workers once
    return this._resetWorkers().then(() => {
      this.setSubscriptions(this._subscriptions);
      const { currentTime = null, isPlaying = false } = this._lastPlayerStateActiveData || {};
      if (currentTime && !isPlaying) {
        this._player.seekPlayback(currentTime);
      }
    });
  }

  async _compileNodeData(userNode: UserNode): Promise<NodeData> {
    // Pass all the nodes a set of basic datatypes that we know how to render.
    // These could be overwritten later by bag datatypes, but these datatype definitions should be very stable.
    const { topics = [], datatypes = {} } = this._lastPlayerStateActiveData || {};
    const nodeDatatypes = { ...getGlobalHooks().getBasicDatatypes(), ...datatypes };

    const rosLib = await this._getRosLib();
    const { name, sourceCode } = userNode;
    const transformMessage = { name, sourceCode, topics, rosLib, datatypes: nodeDatatypes };
    const transformWorker = this._getTransformWorker();
    return transformWorker.send("transform", transformMessage);
  }

  // Defines the inputs/outputs and worker interface of a user node.
  _createNodeRegistrationFromNodeData(nodeId: string, nodeData: NodeData): NodeRegistration {
    const { inputTopics, outputTopic, transpiledCode, projectCode, outputDatatype } = nodeData;

    let bobjectSender;
    let rpc;
    let terminateSignal = signal<void>();
    return {
      nodeId,
      nodeData,
      inputs: inputTopics,
      output: { name: outputTopic, datatype: outputDatatype },
      processMessages: async (messages: Message[], datatypes: RosDatatypes, globalVariables: GlobalVariables) => {
        // We allow _resetWorkers to "cancel" the processing by creating a new signal every time we process a message
        terminateSignal = signal<void>();

        // Register the node within a web worker to be executed.
        if (!bobjectSender || !rpc) {
          rpc = this._unusedNodeRuntimeWorkers.pop() || rpcFromNewSharedWorker(new UserNodePlayerWorker(uuid.v4()));
          bobjectSender = new BobjectRpcSender(rpc, true);
          const { error, userNodeDiagnostics, userNodeLogs } = await rpc.send<RegistrationOutput>("registerNode", {
            projectCode,
            nodeCode: transpiledCode,
            datatypes,
            datatype: nodeData.outputDatatype,
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
            return [];
          }
          this._addUserNodeLogs(nodeId, userNodeLogs);
        }

        const addMessagesResult = await Promise.race([bobjectSender.send("addMessages", messages), terminateSignal]);
        if (!addMessagesResult) {
          return []; // reset
        }
        // TODO: FUTURE - surface runtime errors / infinite loop errors
        const processMessagesResult = await Promise.race([
          rpc.send<ProcessMessagesOutput>("processMessages", {
            globalVariables,
            outputTopic,
          }),
          terminateSignal,
        ]);
        if (!processMessagesResult) {
          return []; // reset
        }
        if (processMessagesResult.error) {
          this._setUserNodeDiagnostics(nodeId, [
            {
              source: Sources.Runtime,
              severity: DiagnosticSeverity.Error,
              message: processMessagesResult.error,
              code: ErrorCodes.RUNTIME,
            },
          ]);
        }
        this._addUserNodeLogs(nodeId, processMessagesResult.userNodeLogs);
        if (processMessagesResult.type === "parsed") {
          return processMessagesResult.messages;
        }
        const { serializedMessages, buffer, bigString } = processMessagesResult.binaryData;
        const offsets = serializedMessages.map(({ offset }) => offset);
        const bobjects = getObjects(datatypes, nodeData.outputDatatype, buffer, bigString, offsets);
        return bobjects.map((message, i) => ({
          receiveTime: serializedMessages[i].receiveTime,
          topic: serializedMessages[i].topic,
          message,
        }));
      },
      terminate: () => {
        terminateSignal.resolve();
        if (rpc) {
          this._unusedNodeRuntimeWorkers.push(rpc);
          rpc = null;
        }
      },
    };
  }

  async _createMultiSourceNodeRegistration(nodeId: string, userNode: UserNode): Promise<NodeRegistration[]> {
    const nodeData = await this._compileNodeData(userNode);
    const nodeRegistration = this._createNodeRegistrationFromNodeData(nodeId, nodeData);
    const allNodeRegistrations = [nodeRegistration];

    // If the input doesn't use any source two input topics, automatically support source two
    if (nodeData.enableSecondSource) {
      const outputTopic = joinTopics($WEBVIZ_SOURCE_2, nodeData.outputTopic);
      const inputTopics = addTopicPrefix(nodeData.inputTopics, $WEBVIZ_SOURCE_2);
      const nodeDataSourceTwo = { ...nodeData, inputTopics, outputTopic };
      const nodeRegistrationTwoRaw = this._createNodeRegistrationFromNodeData(nodeId, nodeDataSourceTwo);

      // Pre and post-process the node's messages so the topics are correct
      const nodeRegistrationTwo = {
        ...nodeRegistrationTwoRaw,
        processMessages: async (messages: Message[], datatypes: RosDatatypes, globalVariables: GlobalVariables) => {
          const inputMessages = messages.map((m) => ({
            ...m,
            topic: m.topic.replace($WEBVIZ_SOURCE_2, ""),
          }));
          const originalMessages = await nodeRegistrationTwoRaw.processMessages(
            inputMessages,
            datatypes,
            globalVariables
          );
          return originalMessages.map((m) => ({ ...m, topic: outputTopic }));
        },
      };
      allNodeRegistrations.push(nodeRegistrationTwo);
    }

    return allNodeRegistrations;
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
  async _resetWorkers() {
    if (!this._lastPlayerStateActiveData) {
      return;
    }

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

    const allNodeRegistrations = await Promise.all(
      Object.keys(this._userNodes).map(async (nodeId) => this._getNodeRegistration(nodeId, this._userNodes[nodeId]))
    );

    // Filter out nodes with compilation errors
    const nodeRegistrations: Array<NodeRegistration> = flatten(allNodeRegistrations).filter(({ nodeData, nodeId }) => {
      const hasError = hasTransformerErrors(nodeData);
      if (nodeData.diagnostics.length > 0) {
        this._setUserNodeDiagnostics(nodeId, nodeData.diagnostics);
      }
      return !hasError;
    });

    // Create diagnostic errors if more than one node outputs to the same topic
    const nodesByOutputTopic = groupBy(nodeRegistrations, ({ output }) => output.name);
    const [validNodeRegistrations, duplicateNodeRegistrations] = partition(
      nodeRegistrations,
      (nodeReg) => nodeReg === nodesByOutputTopic[nodeReg.output.name][0]
    );
    duplicateNodeRegistrations.forEach(({ nodeId, nodeData }) => {
      this._setUserNodeDiagnostics(nodeId, [
        ...nodeData.diagnostics,
        {
          severity: DiagnosticSeverity.Error,
          message: `Output "${nodeData.outputTopic}" must be unique`,
          source: Sources.OutputTopicChecker,
          code: ErrorCodes.OutputTopicChecker.NOT_UNIQUE,
        },
      ]);
    });

    this._nodeRegistrations = validNodeRegistrations;
    this._nodeRegistrations.forEach(({ nodeId }) => this._setUserNodeDiagnostics(nodeId, []));

    this._pendingResetWorkers = null;
    pending.resolve();
  }

  async _getRosLib(): Promise<string> {
    // We only generate the roslib once, because available topics and datatypes should never change. If they do, for
    // a source or player change, we destroy this player and create a new one.
    if (this._rosLib) {
      return this._rosLib;
    }

    if (!this._lastPlayerStateActiveData) {
      throw new Error("_getRosLib was called before `_lastPlayerStateActiveData` set");
    }

    const { topics, datatypes } = this._lastPlayerStateActiveData;
    const transformWorker = this._getTransformWorker();
    // Add base set of datatypes so nodes can output markers even if the input doesn't have any.
    // Don't try to supply datatypes from node playground scripts previously compiled.
    const rosLib = await transformWorker.send("generateRosLib", {
      topics,
      datatypes: { ...getGlobalHooks().getBasicDatatypes(), ...datatypes },
    });
    this._setRosLib(rosLib);

    return rosLib;
  }

  setListener(listener: (PlayerState) => Promise<void>) {
    this._player.setListener(async (playerState: PlayerState) => {
      const { activeData } = playerState;
      if (!activeData) {
        return listener(playerState);
      }
      const { messages, topics, datatypes, bobjects } = activeData;

      // Reset node state after seeking
      if (activeData.lastSeekTime !== this._lastPlayerStateActiveData?.lastSeekTime) {
        await this._resetWorkers();
      }
      // If we do not have active player data from a previous call, then our
      // player just spun up, meaning we should re-run our user nodes in case
      // they have inputs that now exist in the current player context.
      if (!this._lastPlayerStateActiveData) {
        this._lastPlayerStateActiveData = activeData;
        await this._resetWorkers();
        this.setSubscriptions(this._subscriptions);
        this.requestBackfill();
      }

      const allDatatypes = this._getDatatypes(datatypes, this._nodeRegistrations);
      const { parsedMessages, bobjects: augmentedBobjects } = await this._getMessages(
        messages,
        bobjects,
        allDatatypes,
        this._globalVariables,
        this._nodeRegistrations
      );

      const newPlayerState = {
        ...playerState,
        activeData: {
          ...activeData,
          messages: parsedMessages,
          bobjects: augmentedBobjects,
          topics: this._getTopics(
            topics,
            this._nodeRegistrations.map((nodeRegistration) => ({
              ...nodeRegistration.output,
              inputTopics: nodeRegistration.inputs,
            }))
          ),
          datatypes: allDatatypes,
        },
      };

      this._lastPlayerStateActiveData = playerState.activeData;
      return listener(newPlayerState);
    });
  }

  setSubscriptions(subscriptions: SubscribePayload[]) {
    this._subscriptions = subscriptions;

    const mappedTopics: string[] = [];
    const realTopicSubscriptions: SubscribePayload[] = [];
    const nodeSubscriptions: SubscribePayload[] = [];
    for (const subscription of subscriptions) {
      // For performance, only check topics that start with DEFAULT_WEBVIZ_NODE_PREFIX.
      if (
        !subscription.topic.startsWith(DEFAULT_WEBVIZ_NODE_PREFIX) &&
        !subscription.topic.startsWith(`${$WEBVIZ_SOURCE_2}${DEFAULT_WEBVIZ_NODE_PREFIX}`)
      ) {
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
            // Bobjects are parsed inside the worker.
            format: "bobjects",
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
  setMessageOrder = (messageOrder: TimestampMethod) => this._player.setMessageOrder(messageOrder);
}
