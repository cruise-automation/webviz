// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import Rpc, { createLinkedChannels } from "./Rpc";
import { setupSendReportErrorHandler, setupReceiveReportErrorHandler } from "./RpcUtils";
import reportError, { setErrorHandler } from "webviz-core/src/util/reportError";

const delay = (time) => new Promise((resolve) => setTimeout(resolve, time));

describe("RpcUtils", () => {
  // We have to test sending and receiving errors separately because in tests we really only have one thread, so we
  // can't separate `reportError` calls on the local and remote threads.
  it("propagates sending errors correctly", async () => {
    const { local: mainChannel, remote: workerChannel } = createLinkedChannels();
    const local = new Rpc(mainChannel);
    let errorObject;
    local.receive("reportError", (err) => {
      errorObject = err;
    });

    const worker = new Rpc(workerChannel);
    setupSendReportErrorHandler(worker);
    reportError("test", new Error("details"), "user");
    await delay(10);
    expect(errorObject).toEqual({
      message: "test",
      details: "Error: details",
      type: "user",
    });

    reportError.expectCalledDuringTest();
  });

  it("propagates receiving errors correctly", async () => {
    const { local: mainChannel, remote: workerChannel } = createLinkedChannels();
    const local = new Rpc(mainChannel);
    setupReceiveReportErrorHandler(local);
    let errorObject;
    setErrorHandler((message, details, type) => {
      errorObject = { message, details, type };
    });

    const worker = new Rpc(workerChannel);
    worker.send("reportError", { message: "test", details: "Error: details", type: "user" });
    await delay(10);
    expect(errorObject).toEqual({
      message: "test",
      details: "Error: details",
      type: "user",
    });

    reportError.expectCalledDuringTest();
  });
});
