// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import ChartJSManager from "./ChartJSManager";
import Rpc from "webviz-core/src/util/Rpc";
import { setupSendReportErrorHandler } from "webviz-core/src/util/RpcUtils";

export default class ChartJSWorker {
  _rpc: Rpc;
  _managersById: { [string]: ChartJSManager };

  constructor(rpc: Rpc) {
    this._managersById = {};

    if (process.env.NODE_ENV !== "test") {
      setupSendReportErrorHandler(this._rpc);
    }

    rpc.receive("initialize", (args) => {
      this._managersById[args.id] = new ChartJSManager(args);
      return this._managersById[args.id].getScaleBounds();
    });
    // $FlowFixMe flow doesn't like function calls in optional chains
    rpc.receive("doZoom", (args) => this._managersById[args.id]?.doZoom(args));
    // $FlowFixMe flow doesn't like function calls in optional chains
    rpc.receive("resetZoomDelta", (args) => this._managersById[args.id]?.resetZoomDelta(args));
    // $FlowFixMe flow doesn't like function calls in optional chains
    rpc.receive("doPan", (args) => this._managersById[args.id]?.doPan(args));
    // $FlowFixMe flow doesn't like function calls in optional chains
    rpc.receive("resetPanDelta", (args) => this._managersById[args.id]?.resetPanDelta(args));
    // $FlowFixMe flow doesn't like function calls in optional chains
    rpc.receive("update", (args) => this._managersById[args.id]?.update(args));
    // $FlowFixMe flow doesn't like function calls in optional chains
    rpc.receive("resetZoom", (args) => this._managersById[args.id]?.resetZoom(args));
    rpc.receive("destroy", (args) => {
      const manager = this._managersById[args.id];
      if (manager) {
        const result = manager.destroy(args);
        delete this._managersById[args.id];
        return result;
      }
    });
    // $FlowFixMe flow doesn't like function calls in optional chains
    rpc.receive("getElementAtEvent", (args) => this._managersById[args.id]?.getElementAtEvent(args));
  }
}

if (global.postMessage && !global.onmessage) {
  new ChartJSWorker(new Rpc(global));
}
