// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { TimeUtil } from "rosbag";

import OrderedStampPlayer, { BUFFER_DURATION_SECS } from "./OrderedStampPlayer";
import FakePlayer from "webviz-core/src/components/MessagePipeline/FakePlayer";
import { PlayerCapabilities, type PlayerState } from "webviz-core/src/players/types";
import UserNodePlayer from "webviz-core/src/players/UserNodePlayer";
import { fromSec, type TimestampMethod } from "webviz-core/src/util/time";

function makeMessage(headerStamp: ?number, receiveTime: number) {
  return {
    topic: "/dummy_topic",
    message: {
      header: {
        stamp: headerStamp == null ? undefined : fromSec(headerStamp),
      },
    },
    receiveTime: fromSec(receiveTime),
  };
}

function getState() {
  return {
    messages: [],
    messageOrder: "receiveTime",
    currentTime: fromSec(10),
    startTime: fromSec(0),
    endTime: fromSec(20),
    isPlaying: true,
    speed: 0.2,
    lastSeekTime: 0,
    topics: [],
    datatypes: {},
    messageDefinitionsByTopic: {},
    playerWarnings: {},
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
        setUserNodeTrust: jest.fn(),
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

    const upstreamMessages = [makeMessage(8.9, 9.5), makeMessage(8, 10), makeMessage(9.5, 10)];

    await fakePlayer.emit({
      ...getState(),
      currentTime: fromSec(10),
      messages: upstreamMessages,
    });
    expect(states).toEqual([
      expect.objectContaining({
        activeData: expect.objectContaining({
          messages: [makeMessage(8, 10), makeMessage(8.9, 9.5)],
          // Received messages up to 10s, can play header stamps up to 9s.
          currentTime: fromSec(9),
          startTime: fromSec(0),
          endTime: fromSec(20 - BUFFER_DURATION_SECS),
        }),
      }),
    ]);
  });

  it("does not emit messages without header stamps in headerStamp mode", async () => {
    const { player, fakePlayer } = makePlayers("headerStamp");
    const states = [];
    player.setListener(async (playerState) => {
      states.push(playerState);
    });

    // if this changes, this test must change as well
    expect(BUFFER_DURATION_SECS).toEqual(1);

    const upstreamMessages = [makeMessage(undefined, 9.5)];

    await fakePlayer.emit({
      ...getState(),
      currentTime: fromSec(10),
      messages: upstreamMessages,
    });
    expect(states).toEqual([
      expect.objectContaining({
        activeData: expect.objectContaining({
          messages: [],
          currentTime: fromSec(9),
          startTime: fromSec(0),
          endTime: fromSec(20 - BUFFER_DURATION_SECS),
          playerWarnings: {
            topicsWithoutHeaderStamps: ["/dummy_topic"],
          },
        }),
      }),
    ]);
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
});
