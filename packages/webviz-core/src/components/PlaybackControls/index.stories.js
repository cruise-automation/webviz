// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { action } from "@storybook/addon-actions";
import { storiesOf } from "@storybook/react";
import React from "react";
import { withScreenshot } from "storybook-chrome-screenshot";

import { UnconnectedPlaybackControls } from ".";
import { type PlayerState } from "webviz-core/src/types/players";

const START_TIME = 1531761690;

function getPlayerState(): PlayerState {
  const player: PlayerState = {
    isPresent: true,
    showSpinner: false,
    showInitializing: false,
    progress: {},
    capabilities: [],
    playerId: "1",
    activeData: {
      messages: [],
      startTime: { sec: START_TIME, nsec: 331 },
      endTime: { sec: START_TIME + 20, nsec: 331 },
      currentTime: { sec: START_TIME + 5, nsec: 331 },
      isPlaying: true,
      speed: 0.2,
      lastSeekTime: 0,
      topics: [],
      datatypes: {},
    },
  };
  return player;
}

storiesOf("<PlaybackControls>", module)
  .addDecorator(withScreenshot())
  .add("playing", () => {
    const pause = action("pause");
    const play = action("play");
    const setSpeed = action("setSpeed");
    const seek = action("seek");
    const player = getPlayerState();
    return (
      <div style={{ padding: 20, margin: 100 }}>
        <UnconnectedPlaybackControls player={player} pause={pause} play={play} setSpeed={setSpeed} seek={seek} />
      </div>
    );
  })
  .add("paused", () => {
    const pause = action("pause");
    const play = action("play");
    const setSpeed = action("setSpeed");
    const seek = action("seek");
    const player = getPlayerState();

    // satisify flow
    if (player.activeData) {
      player.activeData.isPlaying = false;
      player.activeData.startTime.sec += 1;
      player.activeData.endTime.sec += 1;
    }
    return (
      <div style={{ padding: 20, margin: 100 }}>
        <UnconnectedPlaybackControls player={player} pause={pause} play={play} setSpeed={setSpeed} seek={seek} />
      </div>
    );
  })
  .add("tooltip", () => {
    const pause = action("pause");
    const play = action("play");
    const setSpeed = action("setSpeed");
    const seek = action("seek");
    const player = getPlayerState();

    // satisify flow
    if (player.activeData) {
      player.activeData.isPlaying = false;
      player.activeData.startTime.sec += 1;
      player.activeData.endTime.sec += 1;
    }

    // wrap the component so we can get a ref to it and force a mouse over and out event
    class ControlsWithTooltip extends React.Component<*> {
      el: ?UnconnectedPlaybackControls;
      componentDidMount() {
        const { el } = this;
        if (!el) {
          return;
        }
        const e = { clientX: 450 };
        el.onMouseMove((e: any));
      }
      componentWillUnmount() {
        const e = {};
        const { el } = this;
        if (!el) {
          return;
        }
        el.onMouseLeave((e: any));
      }
      render() {
        return (
          <UnconnectedPlaybackControls
            ref={(el) => (this.el = el)}
            player={player}
            pause={pause}
            play={play}
            setSpeed={setSpeed}
            seek={seek}
          />
        );
      }
    }
    return (
      <div style={{ padding: 20, margin: 100 }}>
        <ControlsWithTooltip />
      </div>
    );
  })
  .add("download progress by ranges", () => {
    const player = getPlayerState();
    const pause = action("pause");
    const play = action("play");
    const setSpeed = action("setSpeed");
    const seek = action("seek");
    player.progress.fullyLoadedFractionRanges = [{ start: 0.23, end: 0.6 }, { start: 0.7, end: 1 }];
    return (
      <div style={{ padding: 20, margin: 100 }}>
        <UnconnectedPlaybackControls player={player} pause={pause} play={play} setSpeed={setSpeed} seek={seek} />
      </div>
    );
  });
