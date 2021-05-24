// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import Rpc, { createLinkedChannels } from "./Rpc";
import { setupReceiveReportErrorHandler, setupReceiveLogEventHandler } from "./RpcMainThreadUtils";
import { setupSendReportNotificationHandler, setupLogEventHandler } from "./RpcWorkerUtils";
import delay from "webviz-core/shared/delay";
import { initializeLogEvent, resetLogEventForTests, logEventPerformance } from "webviz-core/src/util/logEvent";
import sendNotification, { setNotificationHandler } from "webviz-core/src/util/sendNotification";

describe("RpcWorkerUtils and RpcMainThreadUtils", () => {
  describe("sendNotification", () => {
    // We have to test sending and receiving errors separately because in tests we really only have one thread, so we
    // can't separate `sendNotification` calls on the local and remote threads.
    it("propagates sending errors correctly", async () => {
      const { local: mainChannel, remote: workerChannel } = createLinkedChannels();
      const main = new Rpc(mainChannel);
      let errorObject;
      main.receive("sendNotification", (err) => {
        errorObject = err;
      });

      const worker = new Rpc(workerChannel);
      setupSendReportNotificationHandler(worker);
      sendNotification("test", new Error("details"), "user", "error");
      await delay(10);
      expect(errorObject).toEqual({
        message: "test",
        details: "Error: details",
        type: "user",
        severity: "error",
      });

      sendNotification.expectCalledDuringTest();
    });

    it("propagates receiving errors correctly", async () => {
      const { local: mainChannel, remote: workerChannel } = createLinkedChannels();
      const main = new Rpc(mainChannel);
      setupReceiveReportErrorHandler(main);
      let errorObject;
      setNotificationHandler((message, details, type, severity) => {
        errorObject = { message, details, type, severity };
      });

      const worker = new Rpc(workerChannel);
      worker.send("sendNotification", { message: "test", details: "details", type: "user", severity: "error" });
      await delay(10);
      expect(errorObject).toEqual({
        message: "test",
        details: "details",
        type: "user",
        severity: "error",
      });

      sendNotification.expectCalledDuringTest();
    });
  });

  describe("logEvent", () => {
    it("sends a logged event", () => {
      resetLogEventForTests();
      const { local: mainChannel, remote: workerChannel } = createLinkedChannels();
      const main = new Rpc(mainChannel);
      const logEventMock = jest.fn();
      main.receive("logEvent", logEventMock);

      const worker = new Rpc(workerChannel);
      setupLogEventHandler(worker);
      logEventPerformance({ category: "Usage", humanReadableName: "some use" }, 0, { a: "1" });

      expect(logEventMock).toHaveBeenCalledWith({
        type: "logEventPerformance",
        params: [
          { category: "Usage", humanReadableName: "some use" },
          0,
          "/",
          {},
          "",
          { a: "1", git_sha: "unknown", node_env: "test" },
        ],
      });
    });

    it("receives a logged event", () => {
      resetLogEventForTests();
      const { local: mainChannel, remote: workerChannel } = createLinkedChannels();
      const main = new Rpc(mainChannel);
      const logEventMock = jest.fn();
      // $FlowFixMe
      initializeLogEvent({ logEventPerformance: logEventMock });
      setupReceiveLogEventHandler(main);

      const worker = new Rpc(workerChannel);
      worker.send("logEvent", {
        type: "logEventPerformance",
        params: [
          { category: "Usage", humanReadableName: "some use" },
          0,
          "/",
          {},
          "",
          { a: "1", git_sha: "unknown", node_env: "test" },
        ],
      });

      expect(logEventMock).toHaveBeenCalledWith({ category: "Usage", humanReadableName: "some use" }, 0, "/", {}, "", {
        a: "1",
        git_sha: "unknown",
        node_env: "test",
      });
    });
  });
});
