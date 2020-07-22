// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { action } from "@storybook/addon-actions";
import { storiesOf } from "@storybook/react";
import { createMemoryHistory } from "history";
import * as React from "react";
import TestUtils from "react-dom/test-utils";

import { UnconnectedPlaybackControls } from ".";
import styles from "./index.module.scss";
import { setPlaybackConfig } from "webviz-core/src/actions/panels";
import { MockMessagePipelineProvider } from "webviz-core/src/components/MessagePipeline";
import { PlayerCapabilities, type PlayerState, type PlayerStateActiveData } from "webviz-core/src/players/types";
import createRootReducer from "webviz-core/src/reducers";
import configureStore from "webviz-core/src/store/configureStore.testing";

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
      topics: [{ name: "/empty_topic", datatype: "VoidType" }],
      datatypes: { VoidType: { fields: [] } },
      messageDefinitionsByTopic: {},
      playerWarnings: {},
    },
  };
  return player;
}

function Wrapper({
  activeData,
  children,
  store,
}: {
  activeData?: ?PlayerStateActiveData,
  children: React.Node,
  store?: any,
}) {
  return (
    <MockMessagePipelineProvider capabilities={["setSpeed"]} store={store} activeData={activeData}>
      <div style={{ padding: 20, margin: 100 }}>{children}</div>
    </MockMessagePipelineProvider>
  );
}

storiesOf("<PlaybackControls>", module)
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

    function mouseOver() {
      const [element] = document.getElementsByClassName(styles.sliderContainer);
      if (element) {
        TestUtils.Simulate.mouseMove(element, { clientX: 450 });
      }
    }
    function mouseOut() {
      const [element] = document.getElementsByClassName(styles.sliderContainer);
      if (element) {
        TestUtils.Simulate.mouseLeave(element);
      }
    }
    // wrap the component so we can get a ref to it and force a mouse over and out event
    function ControlsWithTooltip() {
      React.useEffect(() => {
        mouseOver();
        return mouseOut;
      });
      return <UnconnectedPlaybackControls player={player} pause={pause} play={play} seek={seek} />;
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
    player.progress = {
      ...player.progress,
      fullyLoadedFractionRanges: [{ start: 0.23, end: 0.6 }, { start: 0.7, end: 1 }],
    };
    return (
      <Wrapper>
        <UnconnectedPlaybackControls player={player} pause={pause} play={play} seek={seek} />
      </Wrapper>
    );
  })
  .add("missing headers", () => {
    const store = configureStore(createRootReducer(createMemoryHistory()));
    store.dispatch(setPlaybackConfig({ messageOrder: "headerStamp" }));
    const defaultPlayerState = getPlayerState();
    const player = {
      ...defaultPlayerState,
      activeData: {
        ...defaultPlayerState.activeData,
        messageOrder: "headerStamp",
        playerWarnings: {
          topicsWithoutHeaderStamps: ["/empty_topic"],
        },
      },
    };
    const pause = action("pause");
    const play = action("play");
    const seek = action("seek");
    return (
      <Wrapper activeData={player.activeData} store={store}>
        <UnconnectedPlaybackControls player={player} pause={pause} play={play} seek={seek} />
      </Wrapper>
    );
  })
  .add("missing headers modal", () => {
    const store = configureStore(createRootReducer(createMemoryHistory()));
    store.dispatch(setPlaybackConfig({ messageOrder: "headerStamp" }));
    const defaultPlayerState = getPlayerState();
    const player = {
      ...defaultPlayerState,
      activeData: {
        ...defaultPlayerState.activeData,
        messageOrder: "headerStamp",
        playerWarnings: {
          topicsWithoutHeaderStamps: ["/empty_topic"],
        },
      },
    };
    const pause = action("pause");
    const play = action("play");
    const seek = action("seek");

    function click() {
      const element = document.querySelector("[data-test='missing-headers-icon']");
      if (element) {
        TestUtils.Simulate.click(element);
      }
    }

    // wrap the component so we can get a ref to it and force a mouse over and out event
    function ControlsWithModal() {
      React.useEffect(() => click());
      return <UnconnectedPlaybackControls player={player} pause={pause} play={play} seek={seek} />;
    }

    return (
      <Wrapper activeData={player.activeData} store={store}>
        <ControlsWithModal />
      </Wrapper>
    );
  });
