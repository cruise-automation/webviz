// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { renderImage } from "./renderImage";
import { type Dimensions, type RawMarkerData, type OffscreenCanvas } from "./util";
import type { Message } from "webviz-core/src/players/types";
import Rpc from "webviz-core/src/util/Rpc";
import { setupWorker } from "webviz-core/src/util/RpcUtils";

export default class ImageCanvasWorker {
  _idToCanvas: { [string]: OffscreenCanvas } = {};
  _rpc: Rpc;

  constructor(rpc: Rpc) {
    setupWorker(rpc);
    this._rpc = rpc;

    rpc.receive("initialize", async ({ id, canvas }: { id: string, canvas: OffscreenCanvas }) => {
      this._idToCanvas[id] = canvas;
    });

    rpc.receive(
      "renderImage",
      async ({
        id,
        imageMessage,
        imageMessageDatatype,
        rawMarkerData,
      }: {
        id: string,
        imageMessage: ?Message,
        imageMessageDatatype: ?string,
        rawMarkerData: RawMarkerData,
      }): Promise<?Dimensions> => {
        const canvas = this._idToCanvas[id];
        return renderImage({ canvas, imageMessage, imageMessageDatatype, rawMarkerData });
      }
    );
  }
}

if (global.postMessage && !global.onmessage) {
  new ImageCanvasWorker(new Rpc(global));
}
