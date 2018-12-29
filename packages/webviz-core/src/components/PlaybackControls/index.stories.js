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
import { Time } from "rosbag";
import { withScreenshot } from "storybook-chrome-screenshot";

import { UnconnectedPlaybackControls } from ".";
import type { DataSourceState } from "webviz-core/src/reducers/dataSource";

const START_TIME = 1531761690;

function getDataSourceState(): DataSourceState {
  const dataSource: DataSourceState = {
    id: 2,
    isLive: true,
    isConnecting: false,
    reconnectDelayMillis: 0,
    websocket: "",
    frame: {},
    topics: [],
    isPlaying: true,
    speed: 0.2,
    auxiliaryData: {
      timestamps: [],
    },
    lastSeekTime: 0,
    startTime: new Time(START_TIME, 331),
    endTime: new Time(START_TIME + 20, 331),
    currentTime: new Time(START_TIME + 5, 331),
    capabilities: [],
    datatypes: {},
    subscriptions: [],
    publishers: [],
    progress: {},
  };
  return dataSource;
}

storiesOf("<PlaybackControls>", module)
  .addDecorator(withScreenshot())
  .add("playing", () => {
    const pause = action("pause");
    const play = action("play");
    const setSpeed = action("setSpeed");
    const seek = action("seek");
    const dataSource = getDataSourceState();
    dataSource.isPlaying = true;
    return (
      <div style={{ padding: 20, margin: 100 }}>
        <UnconnectedPlaybackControls
          dataSource={dataSource}
          pause={pause}
          play={play}
          setSpeed={setSpeed}
          seek={seek}
        />
      </div>
    );
  })
  .add("paused", () => {
    const pause = action("pause");
    const play = action("play");
    const setSpeed = action("setSpeed");
    const seek = action("seek");
    const dataSource = getDataSourceState();

    // satisify flow
    if (dataSource.startTime && dataSource.endTime) {
      dataSource.startTime.sec += 1;
      dataSource.endTime.sec += 1;
    }
    dataSource.isPlaying = false;
    return (
      <div style={{ padding: 20, margin: 100 }}>
        <UnconnectedPlaybackControls
          dataSource={dataSource}
          pause={pause}
          play={play}
          setSpeed={setSpeed}
          seek={seek}
        />
      </div>
    );
  })
  .add("tooltip", () => {
    const pause = action("pause");
    const play = action("play");
    const setSpeed = action("setSpeed");
    const seek = action("seek");
    const dataSource = getDataSourceState();

    // satisify flow
    if (dataSource.startTime && dataSource.endTime) {
      dataSource.startTime.sec += 1;
      dataSource.endTime.sec += 1;
    }
    dataSource.isPlaying = false;

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
            dataSource={dataSource}
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
  });
