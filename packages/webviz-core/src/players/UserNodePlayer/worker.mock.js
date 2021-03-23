// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { flatten, isPlainObject } from "lodash";

import { processMessage, registerNode } from "webviz-core/src/players/UserNodePlayer/nodeRuntimeWorker/registry";
import transform from "webviz-core/src/players/UserNodePlayer/nodeTransformerWorker/transformer";
import generateRosLib from "webviz-core/src/players/UserNodePlayer/nodeTransformerWorker/typegen";
import { BobjectRpcReceiver } from "webviz-core/src/util/binaryObjects/BobjectRpc";
import Rpc, { type Channel, createLinkedChannels } from "webviz-core/src/util/Rpc";

const validateWorkerArgs = (arg: any) => {
  expect(arg).not.toBeInstanceOf(Function);

  if (isPlainObject(arg)) {
    Object.values(arg).forEach((val) => {
      validateWorkerArgs(val);
    });
  } else if (Array.isArray(arg)) {
    arg.forEach(validateWorkerArgs);
  }
};

// One test class that implements both typescript compilation and message transformation.
export default class MockUserNodePlayerWorker {
  port: Channel;

  constructor() {
    const { local, remote } = createLinkedChannels();
    this.port = local;

    // $FlowFixMe: Pretend to be a SharedWorker which has a start() method
    local.start = () => {};
    const receiver = new Rpc(remote);
    const receiveAndLog = (action, impl) => {
      receiver.receive(action, (...args) => {
        validateWorkerArgs(args);
        this.messageSpy(action);
        const ret = impl(...args);
        validateWorkerArgs(ret);
        return ret;
      });
    };
    receiveAndLog("generateRosLib", generateRosLib);
    receiveAndLog("transform", transform);
    receiveAndLog("registerNode", registerNode);
    let messagesToProcess = [];
    new BobjectRpcReceiver(receiver).receive("addMessage", "parsed", async (message) => {
      this.messageSpy("addMessage");
      messagesToProcess.push(message);
      return true;
    });
    receiveAndLog("processMessages", ({ globalVariables, outputTopic }) => {
      const results = messagesToProcess.map((message) => processMessage({ message, globalVariables, outputTopic }));
      const lastError = results
        .map(({ error }) => error)
        .filter(Boolean)
        .pop();
      const logs = flatten(results.map(({ userNodeLogs }) => userNodeLogs));
      const messages = results.map(({ message }) => message).filter(Boolean);
      messagesToProcess = [];
      return { error: lastError, userNodeLogs: logs, messages };
    });
  }

  // So tests can spy on what gets called
  messageSpy(_action: string) {}
}
