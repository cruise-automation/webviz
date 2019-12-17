// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import warnOnOutOfSyncMessages from "./warnOnOutOfSyncMessages";
import reportError from "webviz-core/src/util/reportError";

describe("MessagePipeline/warnOnOutOfSyncMessages", () => {
  it("calls report error when messages are out of order", () => {
    warnOnOutOfSyncMessages({
      isPresent: true,
      showSpinner: false,
      showInitializing: false,
      progress: {},
      capabilities: [],
      playerId: "test",
      activeData: {
        topics: [
          { name: "/foo", datatype: "visualization_msgs/Marker" },
          { name: "/bar", datatype: "visualization_msgs/Marker" },
        ],
        datatypes: {},
        currentTime: {
          sec: 1,
          nsec: 11,
        },
        speed: 0.2,
        lastSeekTime: 1.0,
        startTime: { sec: 0, nsec: 0 },
        endTime: { sec: 2, nsec: 0 },
        isPlaying: false,
        messages: [
          {
            topic: "/foo",
            op: "message",
            datatype: "visualization_msgs/Marker",
            receiveTime: { sec: 1, nsec: 10 },
            message: {},
          },
          {
            topic: "/bar",
            op: "message",
            datatype: "visualization_msgs/Marker",
            receiveTime: { sec: 1, nsec: 5 },
            message: {},
          },
        ],
      },
    });
    reportError.expectCalledDuringTest();
  });
});
