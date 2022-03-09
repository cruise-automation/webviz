// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { isEqual } from "lodash";
import microMemoize from "micro-memoize";
import Queue from "promise-queue";
import { type RosMsgDefinition, type Time, TimeUtil } from "rosbag";
import uuid from "uuid";

// Filename of nodeTransformerWorker is recognized by the server, and given a special header to
// ensure user-supplied code cannot make network requests.
// $FlowFixMe - flow does not like workers.
import NodeDataWorker from "sharedworker-loader?name=nodeTransformerWorker-[hash].[ext]!webviz-core/src/players/UserNodePlayer/nodeTransformerWorker"; // eslint-disable-line
// $FlowFixMe - flow does not like workers.
import UserNodePlayerWorker from "sharedworker-loader?name=nodeRuntimeWorker-[hash].[ext]!webviz-core/src/players/UserNodePlayer/nodeRuntimeWorker"; // eslint-disable-line
import type {
  DataProviderDescriptor,
  ExtensionPoint,
  GetDataProvider,
  GetMessagesResult,
  GetMessagesTopics,
  InitializationResult,
  DataProvider,
  ParsedMessageDefinitions,
  SetGlobalVariablesResult,
  SetUserNodesResult,
} from "webviz-core/src/dataProviders/types";
import type { GlobalVariables } from "webviz-core/src/hooks/useGlobalVariables";
import type { Topic } from "webviz-core/src/players/types";
import type { NodeData, NodeRegistration, UserNodeLog } from "webviz-core/src/players/UserNodePlayer/types";
import { DiagnosticSeverity, ErrorCodes, Sources } from "webviz-core/src/players/UserNodePlayer/types";
import {
  createNodeRegistrationFromNodeData,
  getSecondSourceProcessMessages,
  hasTransformerErrors,
} from "webviz-core/src/players/UserNodePlayer/utils";
import type { UserNode, UserNodes, CompiledUserNodeData } from "webviz-core/src/types/panels";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";
import { objectValues } from "webviz-core/src/util";
import { isBobject, wrapJsObject } from "webviz-core/src/util/binaryObjects";
import { isComplex } from "webviz-core/src/util/binaryObjects/messageDefinitionUtils";
import { $WEBVIZ_SOURCE_2 } from "webviz-core/src/util/globalConstants";
import Rpc from "webviz-core/src/util/Rpc";
import { rpcFromNewSharedWorker } from "webviz-core/src/util/RpcMainThreadUtils";
import { addTopicPrefix, joinTopics } from "webviz-core/src/util/topicUtils";

export const getMessageDefinitionForDatatype = (datatypes: RosDatatypes, datatype: string): RosMsgDefinition[] => {
  const complexDatatypesUsed = new Set([]);
  // ret is initially stored from "smallest" to largest, and is reversed before returning it.
  const ret = [];
  // Post-order depth-first search.
  const depthFirstSearch = (dfsDatatype) => {
    if (complexDatatypesUsed.has(dfsDatatype)) {
      return;
    }
    const { fields } = datatypes[dfsDatatype];
    fields.forEach(({ type }) => {
      if (isComplex(type)) {
        depthFirstSearch(type);
      }
    });
    ret.push({ name: dfsDatatype, definitions: fields });
    complexDatatypesUsed.add(dfsDatatype);
  };
  depthFirstSearch(datatype);
  return ret.reverse();
};

type RegistrationState = $ReadOnly<{|
  registration: NodeRegistration,
  endTime?: Time,
|}>;

export default class NodePlaygroundDataProvider implements DataProvider {
  _provider: DataProvider;
  _providerInitializationResult: InitializationResult;
  _userNodes: UserNodes = {};
  _globalVariables: GlobalVariables;
  _basicDatatypes: RosDatatypes;
  _childMessageDefinitions: ParsedMessageDefinitions;
  _extensionPoint: ExtensionPoint;
  _nodeTransformRpc: Rpc;
  _rosLib: string;
  _childDatatypes: RosDatatypes;
  _allDatatypes: RosDatatypes;
  _unusedNodeRuntimeRpcs: Rpc[] = [];
  _setCompiledUserNodeData: (nodeId: string, compiledNodeData: CompiledUserNodeData) => void;
  _addUserNodeLogs: (nodeId: string, logs: UserNodeLog[]) => void;
  _nodeRegistrationsByTopic: { [topic: string]: RegistrationState } = {};
  // Source2 registrations come from the same node id.
  _nodeRegistrationsByNodeId: { [nodeId: string]: NodeRegistration[] } = {};
  _maxUserNodes: number = 0;

  // Concurrency notes:
  // Nodes are compiled and run in workers, and these operations are inherently async. Potential
  // sources of trouble include sequences like,
  //  1. getMessages call c1 starts with set of global variables g1.
  //  2. Global variables change to g2, and the MemoryCacheDataProvider clears its message cache.
  //  3. getMessages call c1 (with variables g1) returns, and g1-related messages are inserted into
  //     the memory cache.
  // To protect against this, operations relating to nodes and global variables (setUserNodes,
  // setGlobalVariables, getMessages) are synchronized after initialization.
  _stateSync: Queue = new Queue(1);

  constructor(
    {
      basicDatatypes,
      userNodes,
      globalVariables,
    }: {| basicDatatypes: RosDatatypes, userNodes: UserNodes, globalVariables: GlobalVariables |},
    children: DataProviderDescriptor[],
    getDataProvider: GetDataProvider
  ) {
    this._maxUserNodes = Math.max(this._maxUserNodes, Object.keys(userNodes).length);
    if (children.length !== 1) {
      throw new Error(`Incorrect number of children to ${this.constructor.name}: ${children.length} (expected 1)`);
    }
    this._provider = getDataProvider(children[0]);
    this._userNodes = userNodes;
    this._globalVariables = globalVariables;
    this._nodeTransformRpc = rpcFromNewSharedWorker(new NodeDataWorker(uuid.v4()));
    this._basicDatatypes = basicDatatypes;

    // Not strictly needed yet, but we might get a setUserNodes or setGlobalVariables call before
    // we've initialized, and this makes things a bit more robust -- both filling out more of the
    // object's state, and checking that some helper functions run successfully before init.
    const messageDefinitions = this._getMessageDefinitions();
    this._allDatatypes = messageDefinitions.datatypes;
  }

  async initialize(extensionPoint: ExtensionPoint): Promise<InitializationResult> {
    this._extensionPoint = extensionPoint;

    return this._stateSync.add(async () => {
      const result = (this._providerInitializationResult = await this._provider.initialize(extensionPoint));

      const { messageDefinitions: childMessageDefinitions } = result;
      if (childMessageDefinitions.type === "raw") {
        throw new Error(`${this.constructor.name} requires parsed message definitions.`);
      }
      if (result.providesParsedMessages) {
        throw new Error(`${this.constructor.name} should receive and return bobjects.`);
      }
      this._setCompiledUserNodeData = (nodeId: string, compiledNodeData: CompiledUserNodeData) => {
        extensionPoint.nodePlaygroundActions.setCompiledNodeData({ [nodeId]: compiledNodeData });
      };
      this._addUserNodeLogs = (nodeId: string, logs: UserNodeLog[]) => {
        if (logs.length) {
          extensionPoint.nodePlaygroundActions.addUserNodeLogs({ [nodeId]: { logs } });
        }
      };
      this._childMessageDefinitions = childMessageDefinitions;
      this._childDatatypes = { ...this._basicDatatypes, ...childMessageDefinitions.datatypes };

      this._rosLib = await this._nodeTransformRpc.send("generateRosLib", {
        topics: result.topics,
        datatypes: this._childDatatypes,
      });
      extensionPoint.nodePlaygroundActions.setUserNodeRosLib(this._rosLib);
      const playerUserNodes = this._userNodes;
      this._userNodes = {};
      await this._unsynchronizedSetUserNodes(playerUserNodes);

      const messageDefinitions = this._getMessageDefinitions();
      this._allDatatypes = messageDefinitions.datatypes;

      return {
        ...this._providerInitializationResult,
        topics: this._getTopics(),
        messageDefinitions,
      };
    });
  }

  _createNodeRegistrationFromNodeData(nodeId: string, nodeData: NodeData): NodeRegistration {
    return createNodeRegistrationFromNodeData(
      nodeId,
      nodeData,
      this._setCompiledUserNodeData,
      this._addUserNodeLogs,
      () => this._unusedNodeRuntimeRpcs.pop() || rpcFromNewSharedWorker(new UserNodePlayerWorker(uuid.v4())),
      (rpc) => {
        this._unusedNodeRuntimeRpcs.push(rpc);
      }
    );
  }

  _transformSourceCode = microMemoize(
    (name, sourceCode) =>
      this._nodeTransformRpc.send("transform", {
        name,
        sourceCode,
        rosLib: this._rosLib,
        topics: this._providerInitializationResult.topics,
        datatypes: this._childDatatypes,
      }),
    {
      isEqual,
      isPromise: true,
      maxSize: Infinity, // We prune the cache anytime the userNodes change, so it's not *actually* Infinite
    }
  );

  async _createMultiSourceNodeRegistration(nodeId: string, userNode: UserNode): Promise<NodeRegistration[]> {
    const nodeData = await this._transformSourceCode(userNode.name, userNode.sourceCode);
    const nodeRegistration = this._createNodeRegistrationFromNodeData(nodeId, nodeData);
    const allNodeRegistrations = [nodeRegistration];
    if (nodeData.enableSecondSource) {
      const outputTopic = joinTopics($WEBVIZ_SOURCE_2, nodeData.outputTopic);
      const inputTopics = addTopicPrefix(nodeData.inputTopics, $WEBVIZ_SOURCE_2);
      const nodeDataSourceTwo = { ...nodeData, inputTopics, outputTopic };
      const nodeRegistrationTwoRaw = this._createNodeRegistrationFromNodeData(nodeId, nodeDataSourceTwo);
      allNodeRegistrations.push({
        ...nodeRegistrationTwoRaw,
        // Pre and post-process the node's messages so the topics are correct
        processMessages: getSecondSourceProcessMessages(nodeRegistrationTwoRaw.processMessages, outputTopic),
      });
    }
    return allNodeRegistrations;
  }

  _removeNode(nodeId: string) {
    (this._nodeRegistrationsByNodeId[nodeId] ?? []).forEach((registration) => {
      registration.terminate();
      delete this._nodeRegistrationsByTopic[registration.output.name];
    });
    delete this._nodeRegistrationsByNodeId[nodeId];
    delete this._userNodes[nodeId];
  }

  _addNodeRegistration(registration: NodeRegistration) {
    const { nodeData } = registration;
    const { diagnostics, outputTopic, inputTopics } = nodeData;
    const compiledNodeData = { diagnostics, metadata: { outputTopic, inputTopics } };

    if (hasTransformerErrors(registration.nodeData)) {
      this._setCompiledUserNodeData(registration.nodeId, compiledNodeData);
      return;
    }
    if (this._nodeRegistrationsByTopic[registration.output.name]) {
      this._setCompiledUserNodeData(registration.nodeId, {
        ...compiledNodeData,
        diagnostics: [
          ...compiledNodeData.diagnostics,
          {
            severity: DiagnosticSeverity.Error,
            message: `Output "${registration.output.name}" must be unique`,
            source: Sources.OutputTopicChecker,
            code: ErrorCodes.OutputTopicChecker.NOT_UNIQUE,
          },
        ],
      });
      return;
    }
    if (!this._nodeRegistrationsByNodeId[registration.nodeId]) {
      this._nodeRegistrationsByNodeId[registration.nodeId] = [];
    }
    this._nodeRegistrationsByNodeId[registration.nodeId].push(registration);
    this._nodeRegistrationsByTopic[registration.output.name] = { registration };

    // Node might have warnings.
    this._setCompiledUserNodeData(registration.nodeId, compiledNodeData);
  }

  async _addNodes(userNodes: UserNodes) {
    const allRegistrations = await Promise.all(
      Object.keys(userNodes).map((nodeId) => this._createMultiSourceNodeRegistration(nodeId, userNodes[nodeId]))
    );
    allRegistrations.forEach((nodeRegistrations) => {
      nodeRegistrations.forEach((registration) => {
        this._addNodeRegistration(registration);
      });
    });
    Object.assign(this._userNodes, userNodes);
  }

  _resetNodes(nodeIds: Set<string>) {
    for (const nodeId of nodeIds) {
      this._nodeRegistrationsByNodeId[nodeId].forEach((registration) => {
        registration.reset();
      });
    }
  }

  close(): Promise<void> {
    this._nodeTransformRpc.send("close");
    return this._provider.close();
  }

  getMessages(start: Time, end: Time, topics: GetMessagesTopics): Promise<GetMessagesResult> {
    return this._stateSync.add(() => this._unsynchronizedGetMessages(start, end, topics));
  }
  async _unsynchronizedGetMessages(start: Time, end: Time, topics: GetMessagesTopics): Promise<GetMessagesResult> {
    if (topics.parsedMessages?.length || topics.rosBinaryMessages?.length || !topics.bobjects) {
      throw new Error(`${this.constructor.name} only provides bobjects.`);
    }
    const nodeTopics = new Set();
    const nodesToReset = new Set();
    const childTopics = new Set();
    topics.bobjects.forEach((topic) => {
      const registrationState = this._nodeRegistrationsByTopic[topic];
      if (registrationState) {
        nodeTopics.add(topic);
        if (
          registrationState.endTime &&
          !isEqual(start, TimeUtil.add(registrationState.endTime, { sec: 0, nsec: 1 }))
        ) {
          nodesToReset.add(registrationState.registration.nodeId);
        }
        registrationState.registration.inputs.forEach((input) => {
          if (this._childMessageDefinitions.parsedMessageDefinitionsByTopic[input]) {
            childTopics.add(input);
          }
        });
      } else {
        // If a caller makes a getMessages call while setUserNodes is happening, we'll serialize the
        // execution (updating the nodes then getting the messages), but the set of node topics
        // might change -- the caller might request a topic that is no longer provided. If that
        // happens, just return no messages for the deleted topic.
        if (this._childMessageDefinitions.parsedMessageDefinitionsByTopic[topic]) {
          childTopics.add(topic);
        }
      }
    });
    this._resetNodes(nodesToReset);
    const childResult = childTopics.size
      ? await this._provider.getMessages(start, end, { bobjects: Array.from(childTopics).sort() })
      : { bobjects: [] };

    if (!childResult.bobjects) {
      throw new Error(`${this.constructor.name} received messages of the wrong type.`);
    }
    const childBobjects = childResult.bobjects;
    const nodeBobjects = [];
    await Promise.all(
      Array.from(nodeTopics).map(async (nodeTopic) => {
        const { registration } = this._nodeRegistrationsByTopic[nodeTopic];
        const { inputs, processMessages, output } = registration;
        const inputMessages = childBobjects.filter(({ topic }) => inputs.includes(topic));
        const nodeMessages = await processMessages(inputMessages, this._allDatatypes, this._globalVariables);
        nodeMessages.forEach(({ message, topic, receiveTime }) => {
          const bobject = isBobject(message)
            ? { message, topic, receiveTime }
            : {
                topic,
                receiveTime,
                message: wrapJsObject(this._allDatatypes, output.datatypeName, message),
              };
          nodeBobjects.push(bobject);
        });
        this._nodeRegistrationsByTopic[nodeTopic] = { registration, endTime: end };
      })
    );
    return {
      parsedMessages: undefined,
      rosBinaryMessages: undefined,
      bobjects: nodeBobjects.concat(childBobjects).sort((m1, m2) => TimeUtil.compare(m1.receiveTime, m2.receiveTime)),
    };
  }

  _getTopics(): Topic[] {
    const nodeTopics = Object.keys(this._nodeRegistrationsByTopic).map((topic) => {
      const { registration } = this._nodeRegistrationsByTopic[topic];
      return { ...registration.output, inputTopics: registration.inputs };
    });
    return (this._providerInitializationResult?.topics ?? []).concat(nodeTopics);
  }

  _getMessageDefinitions(): ParsedMessageDefinitions {
    const datatypes = { ...this._childDatatypes };
    const parsedMessageDefinitionsByTopic = { ...this._childMessageDefinitions?.parsedMessageDefinitionsByTopic };
    objectValues(this._nodeRegistrationsByTopic).forEach(({ registration }) => {
      Object.assign(datatypes, registration.nodeData.datatypes);
      parsedMessageDefinitionsByTopic[registration.output.name] = getMessageDefinitionForDatatype(
        datatypes,
        registration.output.datatypeName
      );
    });
    return {
      type: "parsed",
      datatypes,
      messageDefinitionsByTopic: this._childMessageDefinitions?.messageDefinitionsByTopic ?? {},
      parsedMessageDefinitionsByTopic,
    };
  }

  setUserNodes(userNodes: UserNodes): Promise<SetUserNodesResult> {
    return this._stateSync.add(() => this._unsynchronizedSetUserNodes(userNodes));
  }

  async _unsynchronizedSetUserNodes(userNodes: UserNodes): Promise<SetUserNodesResult> {
    this._maxUserNodes = Math.max(this._maxUserNodes, Object.keys(userNodes).length);
    const registrationsByTopicBefore = { ...this._nodeRegistrationsByTopic };
    Object.keys(this._userNodes).forEach((nodeId) => {
      // Remove deleted/updated nodes.
      if (!isEqual(userNodes[nodeId], this._userNodes[nodeId])) {
        this._removeNode(nodeId);
      }
    });
    const nodeIdsToAdd = Object.keys(userNodes).filter((nodeId) => !this._userNodes[nodeId]);
    await this._addNodes(Object.fromEntries(nodeIdsToAdd.map((nodeId) => [nodeId, userNodes[nodeId]])));
    const topicsToInvalidate = new Set();
    Object.keys(registrationsByTopicBefore)
      .concat(Object.keys(this._nodeRegistrationsByTopic))
      .forEach((topic) => {
        if (registrationsByTopicBefore[topic] !== this._nodeRegistrationsByTopic[topic]) {
          topicsToInvalidate.add(topic);
        }
      });
    this._transformSourceCode.cache.keys.splice(this._maxUserNodes + 10, Infinity);
    this._transformSourceCode.cache.values.splice(this._maxUserNodes + 10, Infinity);
    const messageDefinitions = this._getMessageDefinitions();
    this._allDatatypes = messageDefinitions.datatypes;
    return {
      topics: this._getTopics(),
      messageDefinitions,
      topicsToInvalidate,
    };
  }

  setGlobalVariables(globalVariables: GlobalVariables): Promise<SetGlobalVariablesResult> {
    return this._stateSync.add(() => this._unsynchronizedSetGlobalVariables(globalVariables));
  }
  _unsynchronizedSetGlobalVariables(globalVariables: GlobalVariables): Promise<SetGlobalVariablesResult> {
    const topicsToInvalidate = new Set();
    const nodesToReset = new Set();
    objectValues(this._nodeRegistrationsByNodeId).forEach((registrations) => {
      registrations.forEach((registration) => {
        if (
          registration.nodeData.globalVariables.some(
            (variable) => globalVariables[variable] !== this._globalVariables[variable]
          )
        ) {
          topicsToInvalidate.add(registration.output.name);
          nodesToReset.add(registration.nodeId);
        }
      });
    });
    this._resetNodes(nodesToReset);
    this._globalVariables = globalVariables;
    return Promise.resolve({ topicsToInvalidate });
  }
}
