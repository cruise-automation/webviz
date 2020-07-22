// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import warnOnOutOfSyncMessages from "./warnOnOutOfSyncMessages";
import type { Message } from "webviz-core/src/players/types";
import sendNotification from "webviz-core/src/util/sendNotification";

let lastSeekTimeCounter = 1;
const lastSeekTime = () => {
  lastSeekTimeCounter += 1;
  return lastSeekTimeCounter;
};

const playerStateWithMessages = (messages, messageOrder) => ({
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
    messageDefinitionsByTopic: {},
    currentTime: {
      sec: 1,
      nsec: 11,
    },
    speed: 0.2,
    lastSeekTime: lastSeekTime(),
    startTime: { sec: 0, nsec: 0 },
    endTime: { sec: 2, nsec: 0 },
    isPlaying: false,
    messages,
    messageOrder,
    playerWarnings: {},
  },
});

const message = (headerStampSeconds: ?number, receiveTimeSeconds: ?number): Message => ({
  topic: "/foo",
  // $FlowFixMe: Flow type asserts that receiveTime is present but we check it works without anyway.
  receiveTime: receiveTimeSeconds == null ? undefined : { sec: receiveTimeSeconds, nsec: 1 },
  message: { header: headerStampSeconds == null ? undefined : { stamp: { sec: headerStampSeconds, nsec: 1 } } },
});

describe("MessagePipeline/warnOnOutOfSyncMessages", () => {
  describe("when expecting messages ordered by receive time", () => {
    it("calls report error when messages are out of order", () => {
      warnOnOutOfSyncMessages(playerStateWithMessages([message(7, 10), message(8, 9)], "receiveTime"));
      sendNotification.expectCalledDuringTest();
    });

    it("does not report an error when messages are in order", () => {
      warnOnOutOfSyncMessages(playerStateWithMessages([message(8, 9), message(7, 10)], "receiveTime"));
    });

    it("reports an error when given a message with no receive time", () => {
      warnOnOutOfSyncMessages(playerStateWithMessages([message(7, undefined)], "receiveTime"));
      sendNotification.expectCalledDuringTest();
    });

    it("reports an error when given a message with no timestamps at all", () => {
      warnOnOutOfSyncMessages(playerStateWithMessages([message(undefined, undefined)], "receiveTime"));
      sendNotification.expectCalledDuringTest();
    });
  });

  describe("when expecting messages ordered by header stamp", () => {
    it("calls report error when messages are out of order", () => {
      warnOnOutOfSyncMessages(playerStateWithMessages([message(8, 9), message(7, 10)], "headerStamp"));
      sendNotification.expectCalledDuringTest();
    });

    it("does not report an error when messages are in order", () => {
      warnOnOutOfSyncMessages(playerStateWithMessages([message(7, 10), message(8, 9)], "headerStamp"));
    });

    it("reports an error when given a message with no header stamp", () => {
      warnOnOutOfSyncMessages(playerStateWithMessages([message(undefined, 10)], "headerStamp"));
      sendNotification.expectCalledDuringTest();
    });

    it("reports an error when given a message with no timestamps at all", () => {
      warnOnOutOfSyncMessages(playerStateWithMessages([message(undefined, undefined)], "headerStamp"));
      sendNotification.expectCalledDuringTest();
    });

    it("forgives a timestamp-backtracking after a missing header stamp", () => {
      warnOnOutOfSyncMessages(
        playerStateWithMessages(
          [
            message(8, 9),
            message(undefined, 10), // one error
            message(3, 4), // not an error
          ],
          "headerStamp"
        )
      );
      // $FlowFixMe: Flow doesn't know that Jest has mocked sendNotification.
      expect(sendNotification.mock.calls.length).toBe(1);
      sendNotification.expectCalledDuringTest();
    });
  });
});
