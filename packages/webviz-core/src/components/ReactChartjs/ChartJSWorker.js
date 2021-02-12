// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import Chart from "chart.js";

import ChartJSManager from "./ChartJSManager";
import type { RpcLike } from "webviz-core/src/util/FakeRpc";
import installChartjs from "webviz-core/src/util/installChartjs";
import Rpc from "webviz-core/src/util/Rpc";
import { setupWorker } from "webviz-core/src/util/RpcWorkerUtils";
import { inWebWorker } from "webviz-core/src/util/workers";

let hasInstalledChartjs = false;

export default class ChartJSWorker {
  _rpc: RpcLike;
  _managersById: { [string]: ChartJSManager };

  constructor(rpc: RpcLike) {
    if (!hasInstalledChartjs) {
      installChartjs(Chart);
      hasInstalledChartjs = true;
    }
    this._managersById = {};

    if (process.env.NODE_ENV !== "test" && inWebWorker() && this._rpc instanceof Rpc) {
      setupWorker(this._rpc);
    }

    rpc.receive("initialize", (args) => {
      const manager = new ChartJSManager(args);
      this._managersById[args.id] = manager;
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
    rpc.receive("getElementAtXAxis", (args) => this._managersById[args.id]?.getElementAtXAxis(args));
    // $FlowFixMe flow doesn't like function calls in optional chains
    rpc.receive("getDatalabelAtEvent", (args) => this._managersById[args.id]?.getDatalabelAtEvent(args));
  }
}
