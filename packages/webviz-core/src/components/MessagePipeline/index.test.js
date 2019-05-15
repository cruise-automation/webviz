// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { mount } from "enzyme";
import { last } from "lodash";
import * as React from "react";

import { MessagePipelineProvider, MessagePipelineConsumer } from ".";
import FakePlayer from "./FakePlayer";
import signal from "webviz-core/src/util/signal";

describe("MessagePipelineProvider/MessagePipelineConsumer", () => {
  it("returns empty data when no player is given", () => {
    const callback = jest.fn().mockReturnValue(null);
    mount(
      <MessagePipelineProvider>
        <MessagePipelineConsumer>{callback}</MessagePipelineConsumer>
      </MessagePipelineProvider>
    );
    expect(callback.mock.calls).toEqual([
      [
        {
          playerState: {
            activeData: undefined,
            capabilities: [],
            isPresent: false,
            playerId: "",
            progress: {},
            showInitializing: false,
            showSpinner: false,
          },
          subscriptions: [],
          publishers: [],
          frame: {},
          sortedTopics: [],
          datatypes: {},
          setSubscriptions: expect.any(Function),
          setPublishers: expect.any(Function),
          publish: expect.any(Function),
          startPlayback: expect.any(Function),
          pausePlayback: expect.any(Function),
          setPlaybackSpeed: expect.any(Function),
          seekPlayback: expect.any(Function),
        },
      ],
    ]);
  });

  it("updates when the player emits a new state", () => {
    const player = new FakePlayer();
    const callback = jest.fn().mockReturnValue(null);
    mount(
      <MessagePipelineProvider player={player}>
        <MessagePipelineConsumer>{callback}</MessagePipelineConsumer>
      </MessagePipelineProvider>
    );
    player.emit();
    expect(callback.mock.calls).toEqual([
      [
        expect.objectContaining({
          playerState: {
            activeData: undefined,
            capabilities: [],
            isPresent: false,
            playerId: "",
            progress: {},
            showInitializing: false,
            showSpinner: false,
          },
        }),
      ],
      [
        expect.objectContaining({
          playerState: {
            activeData: undefined,
            capabilities: [],
            isPresent: true,
            playerId: "test",
            progress: {},
            showInitializing: false,
            showSpinner: false,
          },
        }),
      ],
    ]);
  });

  it("throws an error when the player emits before the previous emit has been resolved", () => {
    const player = new FakePlayer();
    const callback = jest.fn().mockReturnValue(null);
    mount(
      <MessagePipelineProvider player={player}>
        <MessagePipelineConsumer>{callback}</MessagePipelineConsumer>
      </MessagePipelineProvider>
    );
    player.emit();
    expect(() => player.emit()).toThrow();
  });

  it("sets subscriptions", (done) => {
    const player = new FakePlayer();
    let callCount = 0;
    let lastSubscriptions = [];
    mount(
      <MessagePipelineProvider player={player}>
        <MessagePipelineConsumer>
          {(context) => {
            callCount++;
            lastSubscriptions = context.subscriptions;
            if (callCount === 1) {
              // update the subscriptions immediately after render, not during
              // calling this on the same tick as render causes an error because we're setting state during render loop
              setImmediate(() => {
                context.setSubscriptions("test", [{ topic: "/webviz/test" }]);
                context.setSubscriptions("bar", [{ topic: "/webviz/test2" }]);
              });
            }
            if (callCount === 2) {
              expect(context.subscriptions).toEqual([{ topic: "/webviz/test" }]);
            }
            if (callCount === 3) {
              expect(context.subscriptions).toEqual([{ topic: "/webviz/test" }, { topic: "/webviz/test2" }]);
              // cause the player to emit a frame outside the render loop to trigger another render
              setImmediate(() => {
                player.emit();
              });
            }
            if (callCount === 4) {
              // make sure subscriptions are reference equal when they don't change
              expect(context.subscriptions).toBe(lastSubscriptions);
              done();
            }
            return null;
          }}
        </MessagePipelineConsumer>
      </MessagePipelineProvider>
    );
  });

  it("sets publishers", (done) => {
    const player = new FakePlayer();
    let callCount = 0;
    let lastPublishers = [];
    mount(
      <MessagePipelineProvider player={player}>
        <MessagePipelineConsumer>
          {(context) => {
            callCount++;
            lastPublishers = context.publishers;
            if (callCount === 1) {
              // update the publishers immediately after render, not during
              // calling this on the same tick as render causes an error because we're setting state during render loop
              setImmediate(() => {
                context.setPublishers("test", [{ topic: "/webviz/test", datatype: "test" }]);
                context.setPublishers("bar", [{ topic: "/webviz/test2", datatype: "test2" }]);
              });
            }
            if (callCount === 2) {
              expect(context.publishers).toEqual([{ topic: "/webviz/test", datatype: "test" }]);
            }
            if (callCount === 3) {
              expect(context.publishers).toEqual([
                { topic: "/webviz/test", datatype: "test" },
                { topic: "/webviz/test2", datatype: "test2" },
              ]);
              // cause the player to emit a frame outside the render loop to trigger another render
              setImmediate(() => {
                player.emit();
              });
            }
            if (callCount === 4) {
              // make sure publishers are reference equal when they don't change
              expect(context.publishers).toBe(lastPublishers);
              done();
            }
            return null;
          }}
        </MessagePipelineConsumer>
      </MessagePipelineProvider>
    );
  });

  it("renders with the same callback functions every time", (done) => {
    const player = new FakePlayer();
    let callCount = 0;
    let lastContext;
    let lastPromise = Promise.resolve();
    mount(
      <MessagePipelineProvider player={player}>
        <MessagePipelineConsumer>
          {(context) => {
            callCount++;
            if (callCount > 3) {
              done();
              return null;
            }
            // cause the player to emit a frame outside the render loop to trigger another render
            setImmediate(() => {
              lastPromise.then(() => {
                lastPromise = player.emit();
              });
            });
            // we don't have a last context yet
            if (callCount === 1) {
              return null;
            }
            lastContext = context;
            for (const key in context) {
              const value = context[key];
              if (typeof value === "function") {
                expect(lastContext[key]).toBe(context[key]);
              }
            }
            return null;
          }}
        </MessagePipelineConsumer>
      </MessagePipelineProvider>
    );
  });

  it("resolves listener promise after each render", async () => {
    const player = new FakePlayer();
    const callback = jest.fn().mockReturnValue(null);
    mount(
      <MessagePipelineProvider player={player}>
        <MessagePipelineConsumer>{callback}</MessagePipelineConsumer>
      </MessagePipelineProvider>
    );
    // once for the initialization message
    expect(callback).toHaveBeenCalledTimes(1);
    // Now wait for the player state emit cycle to complete.
    // This promise should resolve when the render loop finishes.
    await player.emit();
    expect(callback).toHaveBeenCalledTimes(2);
    await player.emit();
    expect(callback).toHaveBeenCalledTimes(3);
  });

  it("proxies player methods to player", () => {
    const player = new FakePlayer();
    jest.spyOn(player, "startPlayback");
    jest.spyOn(player, "pausePlayback");
    jest.spyOn(player, "setPlaybackSpeed");
    jest.spyOn(player, "seekPlayback");
    let callCount = 0;
    mount(
      <MessagePipelineProvider player={player}>
        <MessagePipelineConsumer>
          {(context) => {
            callCount++;
            if (callCount === 1) {
              expect(player.startPlayback).toHaveBeenCalledTimes(0);
              expect(player.pausePlayback).toHaveBeenCalledTimes(0);
              expect(player.setPlaybackSpeed).toHaveBeenCalledTimes(0);
              expect(player.seekPlayback).toHaveBeenCalledTimes(0);
              context.startPlayback();
              context.pausePlayback();
              context.setPlaybackSpeed(0.5);
              context.seekPlayback({ sec: 1, nsec: 0 });
              expect(player.startPlayback).toHaveBeenCalledTimes(1);
              expect(player.pausePlayback).toHaveBeenCalledTimes(1);
              expect(player.setPlaybackSpeed).toHaveBeenCalledWith(0.5);
              expect(player.seekPlayback).toHaveBeenCalledWith({ sec: 1, nsec: 0 });
            }
            return null;
          }}
        </MessagePipelineConsumer>
      </MessagePipelineProvider>
    );
  });

  it("closes player on unmount", () => {
    const player = new FakePlayer();
    jest.spyOn(player, "close");
    const el = mount(
      <MessagePipelineProvider player={player}>
        <MessagePipelineConsumer>{() => null}</MessagePipelineConsumer>
      </MessagePipelineProvider>
    );

    el.unmount();
    expect(player.close).toHaveBeenCalledTimes(1);
  });

  describe("when changing the player", () => {
    let player, player2, fn;
    beforeEach(async () => {
      player = new FakePlayer();
      player.playerId = "fake player 1";
      jest.spyOn(player, "close");
      fn = jest.fn().mockReturnValue(null);
      const el = mount(
        <MessagePipelineProvider player={player}>
          <MessagePipelineConsumer>{fn}</MessagePipelineConsumer>
        </MessagePipelineProvider>
      );
      await player.emit();
      expect(fn).toHaveBeenCalledTimes(2);

      player2 = new FakePlayer();
      player2.playerId = "fake player 2";
      el.setProps({ player: player2 });
      expect(player.close).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledTimes(4);
    });

    it("closes old player when new player is supplied and stops old player message flow", async () => {
      await player2.emit();
      expect(fn).toHaveBeenCalledTimes(5);
      await player.emit();
      expect(fn).toHaveBeenCalledTimes(5);
      expect(fn.mock.calls.map((args) => args[0].playerState.playerId)).toEqual([
        "",
        "fake player 1",
        "fake player 1",
        "",
        "fake player 2",
      ]);
    });

    it("does not think the old player is the new player if it emits first", async () => {
      await player.emit();
      expect(fn).toHaveBeenCalledTimes(4);
      await player2.emit();
      expect(fn).toHaveBeenCalledTimes(5);
      expect(fn.mock.calls.map((args) => args[0].playerState.playerId)).toEqual([
        "",
        "fake player 1",
        "fake player 1",
        "",
        "fake player 2",
      ]);
    });
  });

  it("does not throw when interacting w/ context and player is missing", () => {
    mount(
      <MessagePipelineProvider>
        <MessagePipelineConsumer>
          {(context) => {
            context.startPlayback();
            context.pausePlayback();
            context.setPlaybackSpeed(1);
            context.seekPlayback({ sec: 1, nsec: 0 });
            context.publish({ topic: "/foo", msg: {} });
            return null;
          }}
        </MessagePipelineConsumer>
      </MessagePipelineProvider>
    );
  });

  it("transfers subscriptions and publishers between players", async () => {
    const player = new FakePlayer();
    let callCount = 0;
    const wait = signal();
    const el = mount(
      <MessagePipelineProvider player={player}>
        <MessagePipelineConsumer>
          {(context) => {
            callCount++;
            if (callCount === 1) {
              // update the subscriptions immediately after render, not during
              // calling this on the same tick as render causes an error because we're setting state during render loop
              setImmediate(() => {
                context.setSubscriptions("test", [{ topic: "/webviz/test" }]);
                context.setSubscriptions("bar", [{ topic: "/webviz/test2" }]);
                context.setPublishers("test", [{ topic: "/webviz/test", datatype: "test" }]);
                wait.resolve();
              });
            }
            return null;
          }}
        </MessagePipelineConsumer>
      </MessagePipelineProvider>
    );
    await wait;
    const player2 = new FakePlayer();
    el.setProps({ player: player2 });
    expect(player2.subscriptions).toEqual([{ topic: "/webviz/test" }, { topic: "/webviz/test2" }]);
    expect(player2.publishers).toEqual([{ topic: "/webviz/test", datatype: "test" }]);
  });

  it("keeps activeData when closing a player", async () => {
    const player = new FakePlayer();
    const fn = jest.fn().mockReturnValue(null);
    const el = mount(
      <MessagePipelineProvider player={player}>
        <MessagePipelineConsumer>{fn}</MessagePipelineConsumer>
      </MessagePipelineProvider>
    );
    const activeData = {
      messages: [],
      currentTime: { sec: 0, nsec: 0 },
      startTime: { sec: 0, nsec: 0 },
      endTime: { sec: 1, nsec: 0 },
      isPlaying: true,
      speed: 0.2,
      lastSeekTime: 1234,
      topics: [{ name: "/input/foo", datatype: "foo" }],
      datatypes: { foo: [] },
    };
    await player.emit(activeData);
    expect(fn).toHaveBeenCalledTimes(2);

    el.setProps({ player: undefined });
    expect(fn).toHaveBeenCalledTimes(4);
    expect(last(fn.mock.calls)[0].playerState).toEqual({
      activeData,
      capabilities: [],
      isPresent: false,
      playerId: "",
      progress: {},
      showInitializing: false,
      showSpinner: false,
    });
  });
});
