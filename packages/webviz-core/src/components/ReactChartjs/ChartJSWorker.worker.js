// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import ChartJSWorker from "./ChartJSWorker";
import Rpc from "webviz-core/src/util/Rpc";
import { inWebWorker } from "webviz-core/src/util/workers";

export default ChartJSWorker;

if (inWebWorker()) {
  new ChartJSWorker(new Rpc(global));
}
