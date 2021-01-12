// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// Log pauses longer than two seconds. Shorter durations will make more events. We can always filter
// the events, though.
import type { ExtensionPoint } from "webviz-core/src/dataProviders/types";
import { debounceReduce } from "webviz-core/src/util";
import { fromMillis } from "webviz-core/src/util/time";

const STALL_THRESHOLD_MS = 2000;

const getMaybeLogStall = (extensionPoint, stallThresholdMs): ((Buffer) => void) => {
  let firstDataReceivedTime;
  let lastDataReceivedTime;
  let bytesReceived = 0;
  const startOfRequest = new Date();
  return (buffer: Buffer) => {
    const now = new Date();
    if (firstDataReceivedTime == null) {
      firstDataReceivedTime = now;
    }
    if (lastDataReceivedTime != null && now - lastDataReceivedTime > stallThresholdMs) {
      const stallDuration = fromMillis(now - lastDataReceivedTime);
      const requestTimeUntilStall = fromMillis(lastDataReceivedTime - startOfRequest);
      const transferTimeUntilStall = fromMillis(lastDataReceivedTime - firstDataReceivedTime);
      const bytesReceivedBeforeStall = bytesReceived;

      extensionPoint.reportMetadataCallback({
        type: "data_provider_stall",
        stallDuration,
        requestTimeUntilStall,
        transferTimeUntilStall,
        bytesReceivedBeforeStall,
      });
    }
    lastDataReceivedTime = now;
    bytesReceived += buffer.length;
  };
};

const getLogThroughput = (extensionPoint): ((Buffer) => void) => {
  return debounceReduce({
    action: (bytes) => extensionPoint.reportMetadataCallback({ type: "received_bytes", bytes }),
    wait: 10,
    reducer: (bytesSoFar, buffer) => bytesSoFar + buffer.length,
    initialValue: 0,
  });
};

export const getReportMetadataForChunk = (
  extensionPoint: ExtensionPoint,
  stallThresholdMs: number = STALL_THRESHOLD_MS
): ((Buffer) => void) => {
  const maybeLogStall = getMaybeLogStall(extensionPoint, stallThresholdMs);
  const logThroughput = getLogThroughput(extensionPoint);
  return (buffer: Buffer) => {
    maybeLogStall(buffer);
    logThroughput(buffer);
  };
};
