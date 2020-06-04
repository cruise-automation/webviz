// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { action } from "@storybook/addon-actions";
import { storiesOf } from "@storybook/react";
import * as React from "react";
import { withScreenshot } from "storycap";

import { UnconnectedPlaybackControls } from ".";
import { MockMessagePipelineProvider } from "webviz-core/src/components/MessagePipeline";
import { PlayerCapabilities, type PlayerState } from "webviz-core/src/players/types";

const START_TIME = 1531761690;

function getPlayerState(): PlayerState {
  const player: PlayerState = {
    isPresent: true,
    showSpinner: false,
    showInitializing: false,
    progress: {},
    capabilities: [PlayerCapabilities.setSpeed],
    playerId: "1",
    activeData: {
      messages: [],
      messageOrder: "receiveTime",
      startTime: { sec: START_TIME, nsec: 331 },
      endTime: { sec: START_TIME + 20, nsec: 331 },
      currentTime: { sec: START_TIME + 5, nsec: 331 },
      isPlaying: true,
      speed: 0.2,
      lastSeekTime: 0,
      topics: [],
      datatypes: {},
      messageDefinitionsByTopic: {},
    },
  };
  return player;
}

function Wrapper({ children }: { children: React.Node }) {
  return (
    <MockMessagePipelineProvider capabilities={["setSpeed"]}>
      <div style={{ padding: 20, margin: 100 }}>{children}</div>
    </MockMessagePipelineProvider>
  );
}

storiesOf("<PlaybackControls>", module)
  .addDecorator(withScreenshot())
  .add("playing", () => {
    const pause = action("pause");
    const play = action("play");
    const seek = action("seek");
    const player = getPlayerState();
    return (
      <Wrapper>
        <UnconnectedPlaybackControls player={player} pause={pause} play={play} seek={seek} />
      </Wrapper>
    );
  })
  .add("paused", () => {
    const pause = action("pause");
    const play = action("play");
    const seek = action("seek");
    const player = getPlayerState();

    // satisify flow
    if (player.activeData) {
      player.activeData.isPlaying = false;
      player.activeData.startTime.sec += 1;
      player.activeData.endTime.sec += 1;
    }
    return (
      <Wrapper>
        <UnconnectedPlaybackControls player={player} pause={pause} play={play} seek={seek} />
      </Wrapper>
    );
  })
  .add("tooltip", () => {
    const pause = action("pause");
    const play = action("play");
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
            seek={seek}
          />
        );
      }
    }
    return (
      <Wrapper>
        <ControlsWithTooltip />
      </Wrapper>
    );
  })
  .add("download progress by ranges", () => {
    const player = getPlayerState();
    const pause = action("pause");
    const play = action("play");
    const seek = action("seek");
    player.progress.fullyLoadedFractionRanges = [{ start: 0.23, end: 0.6 }, { start: 0.7, end: 1 }];
    return (
      <Wrapper>
        <UnconnectedPlaybackControls player={player} pause={pause} play={play} seek={seek} />
      </Wrapper>
    );
  });
