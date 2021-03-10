// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { RenderResult } from "./types";
import type { Frame } from "webviz-core/src/players/types";
import { BobjectRpcSender, BobjectRpcReceiver } from "webviz-core/src/util/binaryObjects/BobjectRpc";
import Rpc from "webviz-core/src/util/Rpc";

type Args = $ReadOnly<{
  [arg: string]: any,
  frame: Frame,
  worldContextValue: { [k: string]: any },
}>;

export class LayoutWorkerDataSender {
  _rpc: Rpc;
  _bobjectSender: BobjectRpcSender;
  _previousArgs: ?Args = null;

  constructor(rpc: Rpc) {
    this._rpc = rpc;
    this._bobjectSender = new BobjectRpcSender(rpc);
  }
  async renderFrame(args: Args): Promise<RenderResult> {
    if (this._previousArgs?.frame !== args.frame) {
      await this._rpc.send<void>("$$clearFrameBobjects");
      for (const topic in args.frame) {
        for (const message of args.frame[topic]) {
          await this._bobjectSender.send<void>("$$addBobjectToFrame", message);
        }
      }
    }
    const dataToSend = {};
    Object.keys(args)
      .filter((k) => k !== "frame" && k !== "worldContextValue")
      .forEach((key) => {
        if (args[key] !== this._previousArgs?.[key]) {
          dataToSend[key] = args[key];
        }
      });
    // WorldContext is grouped together, but it's large and its elements are updated independently,
    // so diffing its contents one layer deeper makes sense from a performance standpoint.
    const contextToSend = {};
    Object.keys(args.worldContextValue).forEach((key) => {
      if (args.worldContextValue[key] !== this._previousArgs?.worldContextValue[key]) {
        contextToSend[key] = args.worldContextValue[key];
      }
    });
    dataToSend.worldContextValue = contextToSend;
    const ret = this._rpc.send<RenderResult>("$$endFrame", dataToSend);
    this._previousArgs = args;
    return ret;
  }
}

export class LayoutWorkerDataReceiver {
  _rpc: Rpc;
  _bobjectReceiver: BobjectRpcReceiver;
  _nextArgs: Args = { frame: {}, worldContextValue: {} };
  constructor(rpc: Rpc, callback: (Args) => RenderResult) {
    this._rpc = rpc;
    this._bobjectReceiver = new BobjectRpcReceiver(rpc);
    this._rpc.receive("$$clearFrameBobjects", () => {
      this._nextArgs = { ...this._nextArgs, frame: {} };
    });
    this._bobjectReceiver.receive("$$addBobjectToFrame", "bobject", async (message) => {
      const { frame } = this._nextArgs;
      if (!frame[message.topic]) {
        frame[message.topic] = [];
      }
      frame[message.topic].push(message);
    });
    this._rpc.receive("$$endFrame", (args) => {
      const worldContextValue = { ...this._nextArgs.worldContextValue, ...args.worldContextValue };
      this._nextArgs = { ...this._nextArgs, ...args, worldContextValue };
      return callback(this._nextArgs);
    });
  }
}
