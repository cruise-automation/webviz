// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { Chart } from "./ChartJSManager";
import ChartJSWorker from "./ChartJSWorker";
import installChartjs from "webviz-core/src/util/installChartjs";
import Rpc from "webviz-core/src/util/Rpc";

const inWorkerEnvironment = global.postMessage && !global.onmessage;

export default ChartJSWorker;

if (inWorkerEnvironment) {
  installChartjs(Chart);
  new ChartJSWorker(new Rpc(global));
}
