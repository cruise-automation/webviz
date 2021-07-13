// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { TimeUtil } from "rosbag";

import OrderedStampPlayer, { BUFFER_DURATION_SECS } from "./OrderedStampPlayer";
import signal from "webviz-core/shared/signal";
import FakePlayer from "webviz-core/src/components/MessagePipeline/FakePlayer";
import { PlayerCapabilities, type PlayerState, type PlayerStateActiveData } from "webviz-core/src/players/types";
import UserNodePlayer from "webviz-core/src/players/UserNodePlayer";
import { deepParse, wrapJsObject } from "webviz-core/src/util/binaryObjects";
import { basicDatatypes } from "webviz-core/src/util/datatypes";
import { fromSec, type TimestampMethod } from "webviz-core/src/util/time";

function makeMessage(headerStamp: ?number, receiveTime: number, topic?: string = "/dummy_topic") {
  return {
    topic,
    message: {
      header: {
        stamp: headerStamp == null ? undefined : fromSec(headerStamp),
      },
    },
    receiveTime: fromSec(receiveTime),
  };
}

function makeBobject(headerStamp: ?number, receiveTime: number, topic?: string = "/dummy_topic") {
  return {
    topic,
    receiveTime: fromSec(receiveTime),
    message: wrapJsObject(basicDatatypes, "geometry_msgs/PoseStamped", {
      header: {
        stamp: headerStamp == null ? undefined : fromSec(headerStamp),
      },
      pose: { position: { x: 0, y: 0, z: 0 }, orientation: { x: 0, y: 0, z: 0, w: 0 } },
    }),
  };
}
const markerArrayDatatype = basicDatatypes["visualization_msgs/MarkerArray"];
const dummyDatatypeWithHeader = {
  dummyDatatypeWithHeader: {
    fields: [
      ...(markerArrayDatatype?.fields || []),
      { type: "std_msgs/Header", name: "header", isArray: false, isComplex: true },
    ],
  },
};

function getState(hasHeaderStamp): PlayerStateActiveData {
  return {
    messages: [],
    bobjects: [],
    messageOrder: "receiveTime",
    currentTime: fromSec(10),
    startTime: fromSec(0),
    endTime: fromSec(20),
    isPlaying: true,
    speed: 0.2,
    lastSeekTime: 0,
    topics: [],
    datatypes: {
      ...basicDatatypes,
      ...(hasHeaderStamp ? dummyDatatypeWithHeader : undefined),
    },
    parsedMessageDefinitionsByTopic: {},
    playerWarnings: {},
    totalBytesReceived: 1234,
  };
}

function makePlayers(initialOrder: TimestampMethod): { player: OrderedStampPlayer, fakePlayer: FakePlayer } {
  // Need to put a UserNodePlayer in between to satisfy flow.
  const fakePlayer = new FakePlayer();
  fakePlayer.setCapabilities([PlayerCapabilities.setSpeed]);
  return {
    fakePlayer,
    player: new OrderedStampPlayer(
      new UserNodePlayer(fakePlayer, {
        setUserNodeDiagnostics: jest.fn(),
        addUserNodeLogs: jest.fn(),
        setUserNodeRosLib: jest.fn(),
      }),
      initialOrder
    ),
  };
}

describe("OrderedStampPlayer", () => {
  it("emits messages before the threshold and sorted by header stamp", async () => {
    const { player, fakePlayer } = makePlayers("headerStamp");
    const states = [];
    player.setListener(async (playerState) => {
      states.push(playerState);
    });

    // if this changes, this test must change as well
    expect(BUFFER_DURATION_SECS).toEqual(1);

    const upstreamMessages = [
      makeMessage(8.9, 9.5),
      makeMessage(8, 10),
      makeMessage(9.0, 10), // exactly equal to the current time. Should be emitted.
      makeMessage(9.5, 10),
    ];

    await fakePlayer.emit({
      ...getState(),
      currentTime: fromSec(10),
      messages: upstreamMessages,
    });
    expect(states).toEqual([
      expect.objectContaining({
        activeData: expect.objectContaining({
          messages: [makeMessage(8, 10), makeMessage(8.9, 9.5), makeMessage(9.0, 10.0)],
          // Received messages up to 10s, can play header stamps up to 9s.
          currentTime: fromSec(9),
          startTime: fromSec(0),
          endTime: fromSec(20 - BUFFER_DURATION_SECS),
        }),
      }),
    ]);
  });

  it("filters and reorders bobjects by header stamp", async () => {
    const { player, fakePlayer } = makePlayers("headerStamp");
    const states = [];
    player.setListener(async (playerState) => {
      states.push(playerState);
    });
    const oldTopics = [
      { name: "/dummy_topic", datatype: "dummyDatatypeWithHeader" },
      { name: "/foo", datatype: "dummyDatatypeWithHeader" },
      { name: "/dummy_no_header_topic", datatype: "visualization_msgs/MarkerArray" },
    ];

    const upstreamBobjects = [
      makeBobject(8.9, 9.5),
      makeBobject(8, 10),
      makeBobject(9.5, 10),
      makeBobject(undefined, 10, "/dummy_no_header_topic"),
    ];

    expect(BUFFER_DURATION_SECS).toEqual(1);
    await fakePlayer.emit({
      ...getState(true),
      topics: oldTopics,

      // Reordering buffer is one second long, so data before header-stamp=9 will be emitted.
      currentTime: fromSec(10),
      bobjects: upstreamBobjects,
    });
    const bobjects = states[0].activeData?.bobjects;
    const topics = states[0].activeData?.topics;

    if (bobjects == null) {
      throw new Error("Satisfy flow.");
    }
    expect(
      bobjects.map(({ receiveTime, message, topic }) => ({ topic, receiveTime, message: deepParse(message) }))
    ).toEqual([
      {
        topic: "/dummy_topic",
        receiveTime: { sec: 10, nsec: 0 },
        message: {
          header: { stamp: { sec: 8, nsec: 0 } },
          pose: { position: { x: 0, y: 0, z: 0 }, orientation: { x: 0, y: 0, z: 0, w: 0 } },
        },
      },
      {
        topic: "/dummy_topic",
        receiveTime: { sec: 9, nsec: 500000000 },
        message: {
          header: { stamp: { sec: 8, nsec: 900000000 } },
          pose: { position: { x: 0, y: 0, z: 0 }, orientation: { x: 0, y: 0, z: 0, w: 0 } },
        },
      },
    ]);
    expect(topics).toEqual(oldTopics);
  });

  it("filters and reorders messages and updates topics by header stamp", async () => {
    const { player, fakePlayer } = makePlayers("headerStamp");
    const states = [];
    player.setListener(async (playerState) => {
      states.push(playerState);
    });

    // if this changes, this test must change as well
    expect(BUFFER_DURATION_SECS).toEqual(1);

    const oldTopics = [
      { name: "/dummy_topic", datatype: "dummyDatatypeWithHeader" },
      { name: "/foo", datatype: "dummyDatatypeWithHeader" },
      { name: "/dummy_no_header_topic", datatype: "visualization_msgs/MarkerArray" },
    ];
    const msg = makeMessage(0.5, 9.5);
    const upstreamMessages = [makeMessage(undefined, 9.5, "/dummy_no_header_topic"), msg];
    await fakePlayer.emit({
      ...getState(true),
      topics: oldTopics,
      currentTime: fromSec(10),
      messages: upstreamMessages,
    });
    expect(states).toEqual([
      expect.objectContaining({
        activeData: expect.objectContaining({
          messages: [msg],
          currentTime: fromSec(9),
          startTime: fromSec(0),
          endTime: fromSec(20 - BUFFER_DURATION_SECS),
          playerWarnings: {
            topicsWithoutHeaderStamps: ["/dummy_no_header_topic"],
          },
        }),
      }),
    ]);
    expect(states[0]?.activeData?.topics).toEqual(oldTopics);
  });

  it("sets time correctly", async () => {
    const { fakePlayer, player } = makePlayers("headerStamp");
    jest.spyOn(fakePlayer, "setPlaybackSpeed");
    const states = [];
    player.setListener(async (playerState) => {
      states.push(playerState);
    });

    await fakePlayer.emit({
      ...getState(),
    });
    expect(fakePlayer.setPlaybackSpeed.mock.calls).toEqual([]);

    // Set playback speed during backfill. Passed straight through.
    player.setPlaybackSpeed(12345);
    expect(fakePlayer.setPlaybackSpeed.mock.calls).toEqual([[12345]]);

    await fakePlayer.emit({
      ...getState(),
      currentTime: TimeUtil.add(getState().currentTime, fromSec(BUFFER_DURATION_SECS + 0.1)),
    });
    // No additional setSpeed calls.
    expect(fakePlayer.setPlaybackSpeed.mock.calls).toEqual([[12345]]);
  });

  it("passes through data normally in receiveTime mode", async () => {
    const { fakePlayer, player } = makePlayers("receiveTime");
    jest.spyOn(fakePlayer, "setPlaybackSpeed");
    const states = [];
    player.setListener(async (playerState) => {
      states.push(playerState);
    });

    await fakePlayer.emit({
      ...getState(),
    });
    // No backfilling, no setPlayback calls.
    expect(fakePlayer.setPlaybackSpeed.mock.calls).toEqual([]);

    // Data passed straight through.
    expect(states).toEqual([expect.objectContaining({ activeData: getState() })]);

    // setPlaybackSpeed calls are passed straight through as well.
    player.setPlaybackSpeed(12345);
    expect(fakePlayer.setPlaybackSpeed.mock.calls).toEqual([[12345]]);
  });

  it("seeks appropriately with dynamic order switching", async () => {
    const { player, fakePlayer } = makePlayers("receiveTime");
    let state: PlayerState;
    player.setListener(async (playerState) => {
      state = playerState;
    });
    jest.spyOn(fakePlayer, "seekPlayback");

    // Emit something in receiveTime, see it passed through.
    await fakePlayer.emit({
      ...getState(),
      currentTime: fromSec(10),
      messages: [makeMessage(10, 10)],
    });
    expect(fakePlayer.seekPlayback).not.toHaveBeenCalled();
    expect(state?.activeData?.messages).toEqual([makeMessage(10, 10)]);

    // Change to header stamp, see a seek and a backfill.
    player.setMessageOrder("headerStamp");
    expect(fakePlayer.seekPlayback).toHaveBeenCalledTimes(1);
    // We want to play from headerStamp=10s, so we ask to seek to receiveTime=11s with a 1s backfill.
    expect(fakePlayer.seekPlayback).toHaveBeenNthCalledWith(1, fromSec(11), { sec: 1, nsec: 0 });

    await fakePlayer.emit({
      ...getState(),
      currentTime: fromSec(10.5),
      messages: [makeMessage(10.5, 10.5)],
    });
    // No new messages to emit.
    expect(state?.activeData?.messages).toEqual([]);

    await fakePlayer.emit({
      ...getState(),
      currentTime: fromSec(12),
      messages: [makeMessage(12, 12)],
    });
    expect(state?.activeData?.messages).toEqual([makeMessage(10.5, 10.5)]);
    // No more seeks yet.
    expect(fakePlayer.seekPlayback).toHaveBeenCalledTimes(1);

    // Switch bag to receiveTime, see another seek. We've buffered up to t=12, so have played up to
    // t=11.
    player.setMessageOrder("receiveTime");
    expect(fakePlayer.seekPlayback).toHaveBeenCalledTimes(2);
    expect(fakePlayer.seekPlayback).toHaveBeenNthCalledWith(2, fromSec(11), undefined);

    // See pass-through behavior again.
    await fakePlayer.emit({
      ...getState(),
      currentTime: fromSec(13),
      messages: [makeMessage(12, 12), makeMessage(13, 13)],
    });
    expect(state?.activeData?.messages).toEqual([makeMessage(12, 12), makeMessage(13, 13)]);
  });

  it("backfills messages in headerStamp mode", async () => {
    const { player, fakePlayer } = makePlayers("headerStamp");
    jest.spyOn(fakePlayer, "seekPlayback");

    const currentTime = fromSec(10);
    player.setListener(async () => {});
    await fakePlayer.emit({
      ...getState(),
      currentTime,
      messages: [],
    });

    // The backfill request should seek the currentTime using BUFFER_DURATION_SECS as a backfillDuration
    player.requestBackfill();
    expect(fakePlayer.seekPlayback).toHaveBeenCalledWith(currentTime, {
      sec: BUFFER_DURATION_SECS,
      nsec: 0,
    });
  });
  it("backfills messages when global variables change", async () => {
    const currentTime = fromSec(10);
    const done = signal();
    const done2 = signal();
    const upstreamMessages = [makeMessage(8.9, 9.5)];
    class ModifiedFakePlayer extends FakePlayer {
      seekPlayback() {
        this.emit({ ...getState(), currentTime, messages: upstreamMessages });
      }
    }
    // Need to put a UserNodePlayer in between to satisfy flow.
    const fakePlayer = new ModifiedFakePlayer();
    fakePlayer.setCapabilities([PlayerCapabilities.setSpeed]);
    const player = new OrderedStampPlayer(
      new UserNodePlayer(fakePlayer, {
        setUserNodeDiagnostics: jest.fn(),
        addUserNodeLogs: jest.fn(),
        setUserNodeRosLib: jest.fn(),
      }),
      "headerStamp"
    );
    jest.spyOn(fakePlayer, "seekPlayback");

    let emitted;
    let state: PlayerState;
    player.setListener(async (playerState) => {
      state = playerState;
      if (!emitted) {
        done.resolve();
        emitted = true;
      } else {
        done2.resolve();
      }
    });

    player.seekPlayback(currentTime);
    await done;

    expect(state?.activeData?.messages).toEqual(upstreamMessages);
    const oldActiveData = state?.activeData;

    // The backfill request should seek the currentTime using BUFFER_DURATION_SECS as a backfillDuration
    player.setGlobalVariables({ futureTime: 1 });
    expect(fakePlayer.seekPlayback).toHaveBeenCalledWith(currentTime, {
      sec: BUFFER_DURATION_SECS,
      nsec: 0,
    });
    await done2;
    expect(state?.activeData === oldActiveData).toBeFalsy();
    expect(state?.activeData?.messages).toEqual(oldActiveData?.messages);
  });
});
