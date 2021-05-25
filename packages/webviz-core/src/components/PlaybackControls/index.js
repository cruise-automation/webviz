// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import Tooltip from "@cruise-automation/tooltip";
import PauseIcon from "@mdi/svg/svg/pause.svg";
import PlayIcon from "@mdi/svg/svg/play.svg";
import SkipNextOutlineIcon from "@mdi/svg/svg/skip-next-outline.svg";
import SkipPreviousOutlineIcon from "@mdi/svg/svg/skip-previous-outline.svg";
import classnames from "classnames";
import React, { memo, useCallback, useMemo, useRef, useState } from "react";
import type { Time } from "rosbag";
import styled from "styled-components";
import uuid from "uuid";

import styles from "./index.module.scss";
import { ProgressPlot } from "./ProgressPlot";
import Button from "webviz-core/src/components/Button";
import Dimensions from "webviz-core/src/components/Dimensions";
import Flex from "webviz-core/src/components/Flex";
import { useClearHoverValue, useSetHoverValue } from "webviz-core/src/components/HoverBar/context";
import PlaybackBarHoverTicks from "webviz-core/src/components/HoverBar/PlaybackBarHoverTicks";
import Icon from "webviz-core/src/components/Icon";
import KeyListener from "webviz-core/src/components/KeyListener";
import MessageOrderControls from "webviz-core/src/components/MessageOrderControls";
import { useMessagePipeline } from "webviz-core/src/components/MessagePipeline";
import PlaybackTimeDisplayMethod from "webviz-core/src/components/PlaybackControls/PlaybackTimeDisplayMethod";
import { togglePlayPause, jumpSeek, DIRECTION } from "webviz-core/src/components/PlaybackControls/sharedHelpers";
import PlaybackSpeedControls from "webviz-core/src/components/PlaybackSpeedControls";
import Slider from "webviz-core/src/components/Slider";
import tooltipStyles from "webviz-core/src/components/Tooltip.module.scss";
import { type PlayerState } from "webviz-core/src/players/types";
import colors from "webviz-core/src/styles/colors.module.scss";
import { formatTime } from "webviz-core/src/util/formatTime";
import { colors as sharedColors } from "webviz-core/src/util/sharedStyleConstants";
import { subtractTimes, toSec, fromSec, formatTimeRaw } from "webviz-core/src/util/time";

const cx = classnames.bind(styles);

export const StyledFullWidthBar = styled.div`
  position: absolute;
  top: 12px;
  left: 0;
  right: 0;
  background-color: ${(props) => (props.activeData ? sharedColors.DARK8 : sharedColors.DARK5)};
  height: 4px;
`;

export const StyledMarker = styled.div.attrs(({ value }) => ({
  style: { transform: `translateX(${value}px) translateX(-2px)` },
}))`
  background-color: white;
  position: absolute;
  height: 36%;
  border: 1px solid ${colors.divider};
  width: 2px;
  top: 32%;
  will-change: transform;
`;

export type PlaybackControlProps = {|
  player: PlayerState,
  auxiliaryData?: any,
  pause: () => void,
  play: () => void,
  seek: (Time) => void,
|};

export const TooltipItem = ({ title, value }: { title: string, value: any }) => (
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

  const onChange = useCallback((value: number) => seek(fromSec(value)), [seek]);

  const keyDownHandlers = useMemo(
    () => ({
      " ": () => togglePlayPause({ pause, play, player: playerState.current }),
      ArrowLeft: (ev: KeyboardEvent) => jumpSeek(DIRECTION.BACKWARD, { seek, player: playerState.current }, ev),
      ArrowRight: (ev: KeyboardEvent) => jumpSeek(DIRECTION.FORWARD, { seek, player: playerState.current }, ev),
    }),
    [pause, play, seek]
  );

  const [hoverComponentId] = useState<string>(uuid.v4());
  const setHoverValue = useSetHoverValue();
  const onMouseMove = useCallback((e: SyntheticMouseEvent<HTMLDivElement>) => {
    const { activeData } = playerState.current;
    if (!activeData) {
      return;
    }
    const { startTime, endTime } = activeData || {};
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
    setHoverValue({ componentId: hoverComponentId, type: "PLAYBACK_SECONDS", value: toSec(timeFromStart) });
  }, [playerState, setHoverValue, hoverComponentId]);

  const clearHoverValue = useClearHoverValue();
  const onMouseLeave = useCallback((_e: SyntheticMouseEvent<HTMLDivElement>) => {
    Tooltip.hide();
    clearHoverValue(hoverComponentId);
  }, [clearHoverValue, hoverComponentId]);

  const { activeData, progress } = player;
  const { isPlaying, startTime, endTime, currentTime } = activeData || {};

  const min = startTime && toSec(startTime);
  const max = endTime && toSec(endTime);
  const value = currentTime == null ? null : toSec(currentTime);
  const step = (max - min) / 500;

  const seekControls = useMemo(
    () => (
      <>
        <Button
          onClick={() => jumpSeek(DIRECTION.BACKWARD, { seek, player: playerState.current })}
          style={{ borderRadius: "4px 0px 0px 4px", marginLeft: "16px", marginRight: "1px" }}
          className={cx([styles.seekBtn, { [styles.inactive]: !activeData }])}>
          <Icon medium tooltip="Seek backward">
            <SkipPreviousOutlineIcon />
          </Icon>
        </Button>
        <Button
          onClick={() => jumpSeek(DIRECTION.FORWARD, { seek, player: playerState.current })}
          style={{ borderRadius: "0px 4px 4px 0px" }}
          className={cx([styles.seekBtn, { [styles.inactive]: !activeData }])}>
          <Icon medium tooltip="Seek forward">
            <SkipNextOutlineIcon />
          </Icon>
        </Button>
      </>
    ),
    [activeData, seek]
  );

  const sliderCallback = useCallback(
    ({ width }) => (
      <Slider
        ref={slider}
        min={min || 0}
        max={max || 100}
        disabled={min == null || max == null}
        step={step}
        value={value}
        draggable
        onChange={onChange}
        renderSlider={(val) => (val == null ? null : <StyledMarker value={val * width} />)}
      />
    ),
    [max, min, onChange, step, value]
  );

  return (
    <Flex row className={styles.container}>
      <KeyListener global keyDownHandlers={keyDownHandlers} />
      <MessageOrderControls />
      <PlaybackSpeedControls />
      <div className={styles.playIconWrapper} onClick={isPlaying ? pause : play}>
        <Icon style={activeData ? {} : { opacity: 0.4 }} xlarge>
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </Icon>
      </div>
      <div className={styles.bar}>
        <StyledFullWidthBar activeData={activeData} />
        <div className={styles.stateBar}>
          <ProgressPlot progress={progress} />
        </div>
        <div ref={el} className={styles.sliderContainer} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}>
          <Dimensions>{sliderCallback}</Dimensions>
        </div>
        <PlaybackBarHoverTicks componentId={hoverComponentId} />
      </div>
      <PlaybackTimeDisplayMethod
        currentTime={currentTime}
        startTime={startTime}
        endTime={endTime}
        onSeek={seek}
        onPause={pause}
        isPlaying={isPlaying}
      />
      {seekControls}
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
