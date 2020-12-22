// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { isPlainObject } from "lodash";

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
    new BobjectRpcReceiver(receiver).receive("processMessage", "parsed", async (message, globalVariables) => {
      this.messageSpy("processMessage");
      return processMessage({ message, globalVariables });
    });
  }

  // So tests can spy on what gets called
  messageSpy(_action: string) {}
}
