// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import {
  registerImageCanvasWorkerListener,
  unregisterImageCanvasWorkerListener,
  testing_GetInternalState,
  testing_reset,
} from "./ImageCanvasWorkerProvider";

jest.mock("webviz-core/src/util/Rpc", () => {
  return class FakeRpc {
    receive() {}
  };
});
jest.mock("./ImageCanvas.worker", () => {
  return class FakeWorker {
    terminated = false;
    terminate() {
      this.terminated = true;
    }
  };
});

describe("ImageCanvasWorkerProvider", () => {
  afterEach(() => {
    testing_reset();
  });

  it("kills the worker when unregistering it", () => {
    registerImageCanvasWorkerListener("1");
    const worker = testing_GetInternalState().worker;
    // $FlowFixMe
    expect(worker.terminated).toEqual(false);
    unregisterImageCanvasWorkerListener("1");
    // $FlowFixMe
    expect(worker.terminated).toEqual(true);
    expect(testing_GetInternalState().rpc).toEqual(null);
    expect(testing_GetInternalState().worker).toEqual(null);
    expect(testing_GetInternalState().listenerIds).toEqual([]);
  });

  it("does not unregister the worker until the last listener stops listening", () => {
    // We create two listeners for the same worker.
    const firstRpc = registerImageCanvasWorkerListener("0");
    registerImageCanvasWorkerListener("1");

    const worker = testing_GetInternalState().worker;
    // $FlowFixMe
    expect(worker.terminated).toEqual(false);
    unregisterImageCanvasWorkerListener("0");
    // $FlowFixMe
    expect(worker.terminated).toEqual(false);
    expect(testing_GetInternalState().rpc).toEqual(firstRpc);
    expect(testing_GetInternalState().listenerIds).toEqual(["1"]);

    unregisterImageCanvasWorkerListener("1");
    // $FlowFixMe
    expect(worker.terminated).toEqual(true);
    expect(testing_GetInternalState().worker).toEqual(null);
    expect(testing_GetInternalState().rpc).toEqual(null);
    expect(testing_GetInternalState().listenerIds).toEqual([]);
  });
});
