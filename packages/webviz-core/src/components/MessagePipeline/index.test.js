// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { mount } from "enzyme";
import { last } from "lodash";
import * as React from "react";
import { act } from "react-dom/test-utils";

import { MessagePipelineProvider, MessagePipelineConsumer, WARN_ON_SUBSCRIPTIONS_WITHIN_TIME_MS } from ".";
import FakePlayer from "./FakePlayer";
import { MAX_PROMISE_TIMEOUT_TIME_MS } from "./pauseFrameForPromise";
import delay from "webviz-core/shared/delay";
import signal from "webviz-core/shared/signal";
import sendNotification from "webviz-core/src/util/sendNotification";

jest.setTimeout(MAX_PROMISE_TIMEOUT_TIME_MS * 3);

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
            showInitializing: true,
            showSpinner: true,
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
          pauseFrame: expect.any(Function),
          requestBackfill: expect.any(Function),
        },
      ],
    ]);
  });

  it("updates when the player emits a new state", async () => {
    const player = new FakePlayer();
    const callback = jest.fn().mockReturnValue(null);
    mount(
      <MessagePipelineProvider player={player}>
        <MessagePipelineConsumer>{callback}</MessagePipelineConsumer>
      </MessagePipelineProvider>
    );
    act(() => {
      player.emit();
    });
    expect(callback.mock.calls).toEqual([
      [
        expect.objectContaining({
          playerState: {
            activeData: undefined,
            capabilities: [],
            isPresent: false,
            playerId: "",
            progress: {},
            showInitializing: true,
            showSpinner: true,
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
    act(() => {
      player.emit();
    });
    expect(() => player.emit()).toThrow("New playerState was emitted before last playerState was rendered.");
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
                act(() => context.setSubscriptions("test", [{ topic: "/webviz/test" }]));
                act(() => context.setSubscriptions("bar", [{ topic: "/webviz/test2" }]));
              });
            }
            if (callCount === 2) {
              expect(context.subscriptions).toEqual([{ topic: "/webviz/test" }]);
            }
            if (callCount === 3) {
              expect(context.subscriptions).toEqual([{ topic: "/webviz/test" }, { topic: "/webviz/test2" }]);
              // cause the player to emit a frame outside the render loop to trigger another render
              setImmediate(() => {
                act(() => {
                  player.emit();
                });
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
                act(() => context.setPublishers("test", [{ topic: "/webviz/test", datatype: "test" }]));
                act(() => context.setPublishers("bar", [{ topic: "/webviz/test2", datatype: "test2" }]));
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
                act(() => {
                  player.emit();
                });
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
                act(() => {
                  lastPromise = player.emit();
                });
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
    await act(() => player.emit());
    expect(callback).toHaveBeenCalledTimes(2);
    await act(() => player.emit());
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
      await act(() => player.emit());
      expect(fn).toHaveBeenCalledTimes(2);

      player2 = new FakePlayer();
      player2.playerId = "fake player 2";
      act(() => el.setProps({ player: player2 }) && undefined);
      expect(player.close).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledTimes(4);
    });

    it("closes old player when new player is supplied and stops old player message flow", async () => {
      await act(() => player2.emit());
      expect(fn).toHaveBeenCalledTimes(5);
      await act(() => player.emit());
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
      await act(() => player.emit());
      expect(fn).toHaveBeenCalledTimes(4);
      await act(() => player2.emit());
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
                act(() => context.setSubscriptions("test", [{ topic: "/webviz/test" }]));
                act(() => context.setSubscriptions("bar", [{ topic: "/webviz/test2" }]));
                act(() => context.setPublishers("test", [{ topic: "/webviz/test", datatype: "test" }]));
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
    act(() => el.setProps({ player: player2 }) && undefined);
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
      messageOrder: "receiveTime",
      currentTime: { sec: 0, nsec: 0 },
      startTime: { sec: 0, nsec: 0 },
      endTime: { sec: 1, nsec: 0 },
      isPlaying: true,
      speed: 0.2,
      lastSeekTime: 1234,
      topics: [{ name: "/input/foo", datatype: "foo" }],
      datatypes: { foo: { fields: [] } },
      messageDefinitionsByTopic: {},
      playerWarnings: {},
    };
    await act(() => player.emit(activeData));
    expect(fn).toHaveBeenCalledTimes(2);

    el.setProps({ player: undefined });
    expect(fn).toHaveBeenCalledTimes(4);
    expect(last(fn.mock.calls)[0].playerState).toEqual({
      activeData,
      capabilities: [],
      isPresent: false,
      playerId: "",
      progress: {},
      showInitializing: true,
      showSpinner: true,
    });
  });

  it("logs a warning if a panel subscribes just after activeData becomes available", async () => {
    jest.spyOn(console, "warn").mockReturnValue();
    const player = new FakePlayer();
    const fn = jest.fn().mockReturnValue(null);
    mount(
      <MessagePipelineProvider player={player}>
        <MessagePipelineConsumer>{fn}</MessagePipelineConsumer>
      </MessagePipelineProvider>
    );
    expect(fn).toHaveBeenCalledTimes(1);
    act(() => fn.mock.calls[0][0].setSubscriptions("id", [{ topic: "/test" }]));
    expect(fn).toHaveBeenCalledTimes(2);
    expect(console.warn).toHaveBeenCalledTimes(0);

    // Emit activeData.
    const activeData = {
      messages: [],
      messageOrder: "receiveTime",
      currentTime: { sec: 0, nsec: 0 },
      startTime: { sec: 0, nsec: 0 },
      endTime: { sec: 1, nsec: 0 },
      isPlaying: true,
      speed: 0.2,
      lastSeekTime: 1234,
      topics: [{ name: "/input/foo", datatype: "foo" }],
      datatypes: { foo: { fields: [] } },
      messageDefinitionsByTopic: {},
      playerWarnings: {},
    };
    await act(() => player.emit(activeData));
    expect(fn).toHaveBeenCalledTimes(3);

    // Calling setSubscriptions right after activeData is emitted results in a warning.
    act(() => fn.mock.calls[0][0].setSubscriptions("id", [{ topic: "/test" }]));
    // $FlowFixMe - Flow doesn't understand `console.warn.mock`
    expect(console.warn.mock.calls).toEqual([
      [
        "Panel subscribed right after Player loaded, which causes unnecessary requests. Please let the Webviz team know about this. Topics: /test",
      ],
    ]);

    // If we wait a little bit, we shouldn't get any additional warnings.
    await delay(WARN_ON_SUBSCRIPTIONS_WITHIN_TIME_MS + 200);
    act(() => fn.mock.calls[0][0].setSubscriptions("id", [{ topic: "/test" }]));
    // $FlowFixMe - Flow doesn't understand `console.warn.mock`
    expect(console.warn.mock.calls.length).toEqual(1);
  });

  describe("pauseFrame", () => {
    let pauseFrame, player, el;

    beforeEach(async () => {
      player = new FakePlayer();
      el = mount(
        <MessagePipelineProvider player={player}>
          <MessagePipelineConsumer>
            {(context) => {
              pauseFrame = context.pauseFrame;
              return null;
            }}
          </MessagePipelineConsumer>
        </MessagePipelineProvider>
      );

      await delay(20);
    });

    it("frames automatically resolve without calling pauseFrame", async () => {
      let hasFinishedFrame = false;
      await act(async () => {
        player.emit().then(() => {
          hasFinishedFrame = true;
        });
      });
      await delay(20);
      expect(hasFinishedFrame).toEqual(true);
    });

    it("when pausing for multiple promises, waits for all of them to resolve", async () => {
      // Start by pausing twice.
      const resumeFunctions = [pauseFrame(""), pauseFrame("")];

      // Trigger the next emit.
      let hasFinishedFrame = false;
      await act(async () => {
        player.emit().then(() => {
          hasFinishedFrame = true;
        });
      });
      await delay(20);
      // We are still pausing.
      expect(hasFinishedFrame).toEqual(false);

      // If we resume only one, we still don't move on to the next frame.
      resumeFunctions[0]();
      await delay(20);
      expect(hasFinishedFrame).toEqual(false);

      // If we resume them all, we can move on to the next frame.
      resumeFunctions[1]();
      await delay(20);
      expect(hasFinishedFrame).toEqual(true);
    });

    it("can wait for promises multiple frames in a row", async () => {
      expect.assertions(8);
      async function runSingleFrame(shouldPause: boolean) {
        let resumeFn;
        if (shouldPause) {
          resumeFn = pauseFrame("");
        }

        let hasFinishedFrame = false;
        await act(async () => {
          player.emit().then(() => {
            hasFinishedFrame = true;
          });
        });
        await delay(20);

        if (resumeFn) {
          expect(hasFinishedFrame).toEqual(false);
          resumeFn();
          await delay(20);
          expect(hasFinishedFrame).toEqual(true);
        } else {
          expect(hasFinishedFrame).toEqual(true);
        }
      }

      await runSingleFrame(true);
      await runSingleFrame(true);
      await runSingleFrame(false);
      await runSingleFrame(false);
      await runSingleFrame(true);
    });

    it("Adding a promise that is previously resolved just plays through", async () => {
      // Pause the current frame, but immediately resume it before we actually emit.
      const resumeFn = pauseFrame("");
      resumeFn();

      // Then trigger the next emit.
      let hasFinishedFrame = false;
      await act(async () => {
        player.emit().then(() => {
          hasFinishedFrame = true;
        });
      });

      await delay(20);

      // Since we have already resumed, we automatically move on to the next frame.
      expect(hasFinishedFrame).toEqual(true);
    });

    it("Adding a promise that does not resolve eventually results in an error, and then continues playing", async () => {
      // Pause the current frame.
      pauseFrame("");

      // Then trigger the next emit.
      let hasFinishedFrame = false;
      await act(async () => {
        player.emit().then(() => {
          hasFinishedFrame = true;
        });
      });
      await delay(20);
      expect(hasFinishedFrame).toEqual(false);

      await delay(MAX_PROMISE_TIMEOUT_TIME_MS + 20);
      expect(hasFinishedFrame).toEqual(true);

      sendNotification.expectCalledDuringTest();
    });

    it("Adding multiple promises that do not resolve eventually results in an error, and then continues playing", async () => {
      // Pause the current frame twice.
      pauseFrame("");
      pauseFrame("");

      // Then trigger the next emit.
      let hasFinishedFrame = false;
      await act(async () => {
        player.emit().then(() => {
          hasFinishedFrame = true;
        });
      });
      await delay(20);
      expect(hasFinishedFrame).toEqual(false);

      await delay(MAX_PROMISE_TIMEOUT_TIME_MS + 20);
      expect(hasFinishedFrame).toEqual(true);

      sendNotification.expectCalledDuringTest();
    });

    it("does not accidentally resolve the second player's promise when replacing the player", async () => {
      // Pause the current frame.
      const firstPlayerResumeFn = pauseFrame("");

      // Then trigger the next emit.
      await act(async () => {
        player.emit();
      });
      await delay(20);

      // Replace the player.
      const newPlayer = new FakePlayer();
      el.setProps({ player: newPlayer });
      await delay(20);

      const secondPlayerResumeFn = pauseFrame("");
      let secondPlayerHasFinishedFrame = false;
      await act(async () => {
        newPlayer.emit().then(() => {
          secondPlayerHasFinishedFrame = true;
        });
      });
      await delay(20);

      expect(secondPlayerHasFinishedFrame).toEqual(false);

      firstPlayerResumeFn();
      await delay(20);
      // The first player was resumed, but the second player should not have finished its frame.
      expect(secondPlayerHasFinishedFrame).toEqual(false);

      secondPlayerResumeFn();
      await delay(20);
      // The second player was resumed and can now finish its frame.
      expect(secondPlayerHasFinishedFrame).toEqual(true);
    });
  });
});
