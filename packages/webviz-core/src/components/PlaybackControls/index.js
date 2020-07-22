// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import Tooltip from "@cruise-automation/tooltip";
import CancelIcon from "@mdi/svg/svg/cancel.svg";
import PauseIcon from "@mdi/svg/svg/pause.svg";
import PlayIcon from "@mdi/svg/svg/play.svg";
import classnames from "classnames";
import React, { memo, useCallback, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import type { Time } from "rosbag";
import styled from "styled-components";
import uuid from "uuid";

import styles from "./index.module.scss";
import PlaybackBarHoverTicks from "./PlaybackBarHoverTicks";
import { ProgressPlot } from "./ProgressPlot";
import { clearHoverValue, setHoverValue } from "webviz-core/src/actions/hoverValue";
import EmptyState from "webviz-core/src/components/EmptyState";
import Flex from "webviz-core/src/components/Flex";
import Icon from "webviz-core/src/components/Icon";
import KeyListener from "webviz-core/src/components/KeyListener";
import MessageOrderControls from "webviz-core/src/components/MessageOrderControls";
import { useMessagePipeline } from "webviz-core/src/components/MessagePipeline";
import { togglePlayPause, jumpSeek, DIRECTION } from "webviz-core/src/components/PlaybackControls/sharedHelpers";
import PlaybackSpeedControls from "webviz-core/src/components/PlaybackSpeedControls";
import Slider from "webviz-core/src/components/Slider";
import tooltipStyles from "webviz-core/src/components/Tooltip.module.scss";
import { type PlayerState } from "webviz-core/src/players/types";
import colors from "webviz-core/src/styles/colors.module.scss";
import { formatTime, formatTimeRaw, subtractTimes, toSec, fromSec } from "webviz-core/src/util/time";

const StyledFullWidthBar = styled.div`
  position: absolute;
  top: 17px;
  left: 0;
  right: 0;
  background-color: ${colors.textMuted};
  height: 5px;
`;

const StyledMarker = styled.div.attrs(({ width }) => ({
  style: { left: `calc(${(width || 0) * 100}% - 2px)` },
}))`
  background-color: white;
  position: absolute;
  height: 36%;
  border: 1px solid ${colors.divider};
  width: 3px;
  top: 32%;
`;

export type PlaybackControlProps = {|
  player: PlayerState,
  auxiliaryData?: any,
  pause: () => void,
  play: () => void,
  seek: (Time) => void,
|};

const TooltipItem = ({ title, value }) => (
  <div>
    <span className={styles.tipTitle}>{title}:</span>
    <span className={styles.tipValue}>{value}</span>
  </div>
);

export const UnconnectedPlaybackControls = memo<PlaybackControlProps>((props: PlaybackControlProps) => {
  const el = useRef<?HTMLDivElement>();
  const slider = useRef<?Slider>();
  const { seek, pause, play, player } = props;

  // playerState is unstable, and will cause callbacks to change identity every frame. They can take
  // a ref instead.
  const playerState = useRef(player);
  playerState.current = player;

  const onChange = useCallback(
    (value: number) => {
      const time = fromSec(value);
      seek(time);
    },
    [seek]
  );

  const keyDownHandlers = useMemo(
    () => ({
      " ": () => togglePlayPause({ pause, play, player: playerState.current }),
      ArrowLeft: (ev: KeyboardEvent) => jumpSeek(DIRECTION.BACKWARD, ev, { seek, player: playerState.current }),
      ArrowRight: (ev: KeyboardEvent) => jumpSeek(DIRECTION.FORWARD, ev, { seek, player: playerState.current }),
    }),
    [pause, play, seek]
  );

  const [hoverComponentId] = useState<string>(uuid.v4());
  const dispatch = useDispatch();
  const onMouseMove = useCallback(
    (e: SyntheticMouseEvent<HTMLDivElement>) => {
      const { activeData } = playerState.current;
      if (!activeData) {
        return;
      }
      const { startTime, endTime } = activeData;
      if (!startTime || !endTime || el.current == null || slider.current == null) {
        return;
      }
      const currentEl = el.current;
      const currentSlider = slider.current;
      const x = e.clientX;
      // fix the y position of the tooltip to float on top of the playback bar
      const y = currentEl.getBoundingClientRect().top;

      const value = currentSlider.getValueAtMouse(e);
      const stamp = fromSec(value);
      const timeFromStart = subtractTimes(stamp, startTime);

      const tip = (
        <div className={classnames(tooltipStyles.tooltip, styles.tip)}>
          <TooltipItem title="ROS" value={formatTimeRaw(stamp)} />
          <TooltipItem title="Time" value={formatTime(stamp)} />
          <TooltipItem title="Elapsed" value={`${toSec(timeFromStart).toFixed(9)} sec`} />
        </div>
      );
      Tooltip.show(x, y, tip, {
        placement: "top",
        offset: { x: 0, y: 0 },
        arrow: <div className={tooltipStyles.arrow} />,
      });
      dispatch(setHoverValue({ componentId: hoverComponentId, type: "PLAYBACK_SECONDS", value: toSec(timeFromStart) }));
    },
    [playerState, dispatch, hoverComponentId]
  );

  const onMouseLeave = useCallback(
    (_e: SyntheticMouseEvent<HTMLDivElement>) => {
      Tooltip.hide();
      dispatch(clearHoverValue({ componentId: hoverComponentId }));
    },
    [dispatch, hoverComponentId]
  );

  const { activeData, showInitializing, progress } = player;

  if (!activeData) {
    const message = showInitializing ? (
      "Player is initializing..."
    ) : (
      <span>
        Drop a <a href="http://wiki.ros.org/ROS/Tutorials/Recording%20and%20playing%20back%20data">ROS bag file</a> or
        connect to a <a href="http://wiki.ros.org/rosbridge_suite/Tutorials/RunningRosbridge">rosbridge</a> to get
        started. Or check out <a href="/worldview">Worldview</a> and other packages on{" "}
        <a href="https://github.com/cruise-automation">GitHub</a>!
      </span>
    );
    return (
      <Flex row className={classnames(styles.container, styles.disconnected)}>
        <Icon large clickable={false}>
          <CancelIcon />
        </Icon>
        <EmptyState alignLeft>{message}</EmptyState>
      </Flex>
    );
  }

  const { isPlaying, startTime, endTime, currentTime } = activeData;

  const min = toSec(startTime);
  const max = toSec(endTime);
  const value = currentTime == null ? null : toSec(currentTime);
  const step = (max - min) / 500;

  return (
    <Flex row className={styles.container}>
      <KeyListener global keyDownHandlers={keyDownHandlers} />
      <div className={styles.playIconWrapper} onClick={isPlaying ? pause : play}>
        <Icon large>{isPlaying ? <PauseIcon /> : <PlayIcon />}</Icon>
      </div>
      <div>
        <PlaybackSpeedControls />
      </div>
      <MessageOrderControls />

      <div className={styles.bar}>
        <StyledFullWidthBar />
        <div className={styles.stateBar}>
          <ProgressPlot progress={progress} />
        </div>
        <div ref={el} className={styles.sliderContainer} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}>
          <Slider
            ref={slider}
            min={min}
            max={max}
            step={step}
            value={value}
            draggable
            onChange={onChange}
            renderSlider={(val) => (val == null ? null : <StyledMarker width={val} />)}
          />
        </div>
        <PlaybackBarHoverTicks componentId={hoverComponentId} />
      </div>
    </Flex>
  );
});

const getProps = ({ pausePlayback, seekPlayback, startPlayback, playerState }) => ({
  pause: pausePlayback,
  seek: seekPlayback,
  play: startPlayback,
  player: playerState,
});

export default function PlaybackControls() {
  return <UnconnectedPlaybackControls {...useMessagePipeline(getProps)} />;
}
