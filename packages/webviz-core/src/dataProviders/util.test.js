// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { mockExtensionPoint } from "./mockExtensionPoint";
import { getReportMetadataForChunk } from "./util";
import delay from "webviz-core/shared/delay";
import { toSec } from "webviz-core/src/util/time";

describe("getReportMetadataForChunk", () => {
  it("logs a stall", async () => {
    const { metadata, extensionPoint } = mockExtensionPoint();
    let time = 0;
    const waitUntil = async (t) => {
      const delayDuration = t - time;
      if (delayDuration < 0) {
        throw new Error(`It's past ${t} already`);
      }
      await delay(delayDuration);
      time = t;
    };
    const reportMetadataForChunk = getReportMetadataForChunk(extensionPoint, 100);
    // Should not result in a stall
    await waitUntil(200);

    reportMetadataForChunk(Buffer.allocUnsafe(100));
    await waitUntil(250);
    reportMetadataForChunk(Buffer.allocUnsafe(100));
    await waitUntil(300);
    reportMetadataForChunk(Buffer.allocUnsafe(100));
    await waitUntil(500);
    reportMetadataForChunk(Buffer.allocUnsafe(100));
    const stalls = metadata.filter(({ type }) => type === "data_provider_stall");
    expect(stalls).toHaveLength(1);
    const stall = stalls[0];
    // Stall happened from 300ms until 500ms. First byte received at 200ms.
    if (stall.type !== "data_provider_stall") {
      throw new Error("Satisfy flow that stall is a DataProviderStall");
    }
    expect(stall.bytesReceivedBeforeStall).toEqual(300);
    expect(toSec(stall.requestTimeUntilStall)).toBeCloseTo(0.3, 1);
    expect(toSec(stall.stallDuration)).toBeCloseTo(0.2, 1);
    expect(toSec(stall.transferTimeUntilStall)).toBeCloseTo(0.1, 1);
  });
});
