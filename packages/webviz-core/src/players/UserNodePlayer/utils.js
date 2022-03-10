// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import signal from "webviz-core/shared/signal";
import type { GlobalVariables } from "webviz-core/src/hooks/useGlobalVariables";
import type { Message } from "webviz-core/src/players/types";
import {
  DiagnosticSeverity,
  ErrorCodes,
  type NodeRegistration,
  type ProcessMessagesOutput,
  type RegistrationOutput,
  Sources,
  type UserNodeLog,
  type NodeData,
} from "webviz-core/src/players/UserNodePlayer/types";
import type { CompiledUserNodeData } from "webviz-core/src/types/panels";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";
import { getObjects } from "webviz-core/src/util/binaryObjects";
import { BobjectRpcSender } from "webviz-core/src/util/binaryObjects/BobjectRpc";
import { $WEBVIZ_SOURCE_2 } from "webviz-core/src/util/globalConstants";
import Rpc from "webviz-core/src/util/Rpc";

// We use a hardcoded filename to avoid issues where slashes in the node's name are treated as subdirectories.
// This name is never shown to users - it's only used during Typescript compilation.
export const NODE_FILE_NAME = "/node.ts";

export const hasTransformerErrors = (nodeData: NodeData): boolean =>
  nodeData.diagnostics.some(({ severity }) => severity === DiagnosticSeverity.Error);

type ProcessMessages = (Message[], RosDatatypes, GlobalVariables) => Promise<Message[]>;
export const getSecondSourceProcessMessages = (processMessages: ProcessMessages, outputTopic: string) => async (
  messages: Message[],
  datatypes: RosDatatypes,
  globalVariables: GlobalVariables
): Promise<Message[]> => {
  const inputMessages = messages.map((m) => ({
    ...m,
    topic: m.topic.replace($WEBVIZ_SOURCE_2, ""),
  }));
  const originalMessages = await processMessages(inputMessages, datatypes, globalVariables);
  return originalMessages.map((m) => ({ ...m, topic: outputTopic }));
};
// Defines the inputs/outputs and worker interface of a user node.
export const createNodeRegistrationFromNodeData = (
  nodeId: string,
  nodeData: NodeData,
  setCompiledNodeData: (nodeId: string, compiledNodeData: CompiledUserNodeData) => void,
  addUserNodeLogs: (nodeId: string, logs: UserNodeLog[]) => void,
  getNodeRuntimeRpc: () => Rpc,
  releaseNodeRuntimeRpc: (Rpc) => void
): NodeRegistration => {
  const { inputTopics, outputTopic, transpiledCode, projectCode, outputDatatype } = nodeData;

  let bobjectSender;
  let rpc;
  let terminateSignal = signal<void>();
  let nodeRegistered = false;
  return {
    nodeId,
    nodeData,
    inputs: inputTopics,
    output: { name: outputTopic, datatypeName: outputDatatype, datatypeId: outputDatatype },
    processMessages: async (messages: Message[], datatypes: RosDatatypes, globalVariables: GlobalVariables) => {
      // We allow _resetWorkers to "cancel" the processing by creating a new signal every time we process a message
      terminateSignal = signal<void>();

      // Register the node within a web worker to be executed.
      if (!bobjectSender || !rpc) {
        rpc = getNodeRuntimeRpc();
        bobjectSender = new BobjectRpcSender(rpc, true);
      }
      if (!nodeRegistered) {
        const { error, userNodeDiagnostics, userNodeLogs } = await rpc.send<RegistrationOutput>("registerNode", {
          projectCode,
          nodeCode: transpiledCode,
          datatypes,
          datatype: nodeData.outputDatatype,
        });
        if (error) {
          setCompiledNodeData(nodeId, {
            diagnostics: [
              ...userNodeDiagnostics,
              {
                source: Sources.Runtime,
                severity: DiagnosticSeverity.Error,
                message: error,
                code: ErrorCodes.RUNTIME,
              },
            ],
          });
          return [];
        }
        nodeRegistered = true;
        addUserNodeLogs(nodeId, userNodeLogs);
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
        setCompiledNodeData(nodeId, {
          diagnostics: [
            {
              source: Sources.Runtime,
              severity: DiagnosticSeverity.Error,
              message: processMessagesResult.error,
              code: ErrorCodes.RUNTIME,
            },
          ],
        });
      }
      addUserNodeLogs(nodeId, processMessagesResult.userNodeLogs);
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
      nodeRegistered = false;
      terminateSignal.resolve();
      if (rpc) {
        releaseNodeRuntimeRpc(rpc);
        rpc = null;
      }
    },
    reset: () => {
      nodeRegistered = false;
    },
  };
};
