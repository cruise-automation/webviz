// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { groupBy, flatten } from "lodash";

import type { RenderResult } from "./types";
import signal, { type Signal } from "webviz-core/shared/signal";
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

  // Synchronization philosophy: We allow multiple concurrent renders hoping React will be smart
  // about merging state updates and smoothing things out. We serialize data-sending, though,
  // because
  //  - Later data-sends are more authoritative than earlier ones, and
  //  - Our state-sending isn't reentrant.
  // We only keep one queued send.
  _currentlySending: boolean = false;
  _queuedSendSignal: ?Signal<void>;

  constructor(rpc: Rpc) {
    this._rpc = rpc;
    this._bobjectSender = new BobjectRpcSender(rpc);
  }
  async renderFrame(args: Args): Promise<boolean> {
    // Returns whether this render request is sent to the worker (true), if it gets evicted from
    // our serial send-queue (false).
    if (this._currentlySending) {
      const maybeOldQueuedSignal = this._queuedSendSignal;
      const newSendSignal = (this._queuedSendSignal = signal());
      if (maybeOldQueuedSignal != null) {
        // Old request gets superseded by this one.
        maybeOldQueuedSignal.resolve();
      }
      await newSendSignal;
      if (this._queuedSendSignal !== newSendSignal) {
        // This request gets superseded by a newer one.
        return false;
      }
      // Ready to send.
    }
    this._currentlySending = true;
    const framesDiffer = this._previousArgs?.frame !== args.frame;
    let bobjects = [];
    if (framesDiffer) {
      bobjects = flatten(Object.keys(args.frame).map((topic) => args.frame[topic]));
    }
    const nonFrameData = {};
    Object.keys(args)
      .filter((k) => k !== "frame" && k !== "worldContextValue")
      .forEach((key) => {
        if (args[key] !== this._previousArgs?.[key]) {
          nonFrameData[key] = args[key];
        }
      });
    // WorldContext is grouped together, but it's large and its elements are updated independently,
    // so diffing its contents one layer deeper makes sense from a performance standpoint.
    if (args.worldContextValue !== this._previousArgs?.worldContextValue) {
      const contextToSend = {};
      Object.keys(args.worldContextValue).forEach((key) => {
        if (args.worldContextValue[key] !== this._previousArgs?.worldContextValue[key]) {
          contextToSend[key] = args.worldContextValue[key];
        }
      });
      nonFrameData.worldContextValue = contextToSend;
    }
    await this._bobjectSender.send<void>("$$startFrame", bobjects, { nonFrameData, framesDiffer });
    this._previousArgs = args;
    this._currentlySending = false;
    if (this._queuedSendSignal) {
      this._queuedSendSignal.resolve();
    }
    return true;
  }
}

export class LayoutWorkerDataReceiver {
  _rpc: Rpc;
  _bobjectReceiver: BobjectRpcReceiver;
  _nextArgs: Args = { frame: {}, worldContextValue: {} };
  constructor(rpc: Rpc, renderFn: (Args) => Promise<RenderResult>) {
    this._rpc = rpc;
    this._bobjectReceiver = new BobjectRpcReceiver(rpc);
    this._bobjectReceiver.receive("$$startFrame", "bobject", async (messages, { framesDiffer, nonFrameData }) => {
      // Leave worldContextValue identity unchanged if it is null.
      const worldContextValue = nonFrameData.worldContextValue
        ? { ...this._nextArgs.worldContextValue, ...nonFrameData.worldContextValue }
        : this._nextArgs.worldContextValue;
      const nextArgs = (this._nextArgs = {
        ...this._nextArgs,
        ...nonFrameData,
        worldContextValue,
        frame: framesDiffer ? groupBy(messages, "topic") : this._nextArgs.frame ?? [],
      });
      setImmediate(() => {
        renderFn(nextArgs).then(({ searchTextMatches }) =>
          rpc.send<void>("finishFrame", {
            frameIndex: nextArgs.frameIndex,
            frameIsEmpty: nextArgs.frame.empty,
            searchTextMatches,
          })
        );
      });
    });
  }
}
