// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import ImageCanvasRenderer from "./ImageCanvasRenderer";
import Rpc from "webviz-core/src/util/Rpc";
import { setupWorker } from "webviz-core/src/util/RpcWorkerUtils";

if (global.postMessage && !global.onmessage) {
  const rpc = new Rpc(global);
  setupWorker(rpc);
  new ImageCanvasRenderer(rpc);
}

export default ImageCanvasRenderer;
