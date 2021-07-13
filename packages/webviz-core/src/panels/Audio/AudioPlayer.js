// @flow
//
//  Copyright (c) 2021-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { useCleanup, useEventListener } from "@cruise-automation/hooks";
import ClipboardOutlineIcon from "@mdi/svg/svg/clipboard-outline.svg";
import clamp from "lodash/clamp";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { type Time } from "rosbag";
import styled from "styled-components";
import uuid from "uuid";

import AudioToolbar from "./AudioToolbar";
import { type ProcessedAudioData } from "./index";
import { generateAudioBuffersFromSample, calculateWaveformData, drawWaveform, bufferToFileBlob } from "./utils";
import Dimensions from "webviz-core/src/components/Dimensions";
import Dropdown from "webviz-core/src/components/Dropdown";
import HoverBar, { SBar } from "webviz-core/src/components/HoverBar";
import { useSetHoverValue, useClearHoverValue } from "webviz-core/src/components/HoverBar/context";
import Icon from "webviz-core/src/components/Icon";
import { useMessagePipeline } from "webviz-core/src/components/MessagePipeline";
import { downloadFiles } from "webviz-core/src/util";
import clipboard from "webviz-core/src/util/clipboard";
import { hexToRgbString } from "webviz-core/src/util/colorUtils";
import { formatTimeRaw } from "webviz-core/src/util/formatTime";
import { useChangeDetector } from "webviz-core/src/util/hooks";
import { colors } from "webviz-core/src/util/sharedStyleConstants";
import { subtractTimes, toSec } from "webviz-core/src/util/time";

const POINT_WIDTH = 3;
const CHANNEL_HEIGHT = 80;
const BAR_HEIGHT = 36;
const CANVAS_MARGIN = 16;

const TIMESTAMP_OPTIONS = [
  {
    label: "header.stamp",
    value: false,
  },
  {
    label: "receive time",
    value: true,
  },
];
const CHANNEL_HOVER_BG = hexToRgbString(colors.RED2, 0.1);

const DEFAULT_WAVE_CONFIG = {
  color: hexToRgbString(colors.LIGHT1, 0.2),
  playedColor: hexToRgbString(colors.LIGHT1, 0.5),
  missingDataColor: colors.DARK2,
  activeChannelColor: colors.RED2,
  activeChannelPlayedColor: colors.RED,
  markerColor: colors.BLUE,
  pointWidth: POINT_WIDTH,
  heightScaleFactor: 4,
  multiChannelHeightScaleFactor: 12, // scale more so the stacked waveforms don't look flat
};

const SPEED_SELECT_OPTIONS = [
  { value: 0.1, label: "0.1x" },
  { value: 0.2, label: "0.2x" },
  { value: 0.5, label: "0.5x" },
  { value: 1, label: "1x" },
  // { value: -1, label: "Sync (bagPlaybackSpeed)x" }, // TODO[Audrey]: add  sync support
];

const SAudioPlayer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  width: 100%;
  position: relative;
`;

const SCanvasWrapper = styled.div`
  position: relative;
  width: 100%;
  overflow-y: scroll;
  overflow-x: hidden;
  margin-left: ${CANVAS_MARGIN}px;
  margin-right: ${CANVAS_MARGIN}px;
`;
const SBarWrapper = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: ${BAR_HEIGHT};
`;

const STimestampWrapper = styled.div`
  position: absolute;
  right: 0;
  bottom: 32px;
  display: flex;
  cursor: pointer;
  width: 284px;
`;

const SDropdown = styled.div`
  width: 132px;
  button {
    background: transparent;
  }
`;
const SCopyTimestamp = styled.div`
  display: flex;
  align-items: center;
  .icon {
    visibility: hidden;
  }
  :hover {
    .icon {
      visibility: visible;
    }
  }
`;

const SChannelHover = styled.div`
  width: 100%;
  position: absolute;
  cursor: pointer;
  :hover {
    background: ${CHANNEL_HOVER_BG};
  }
`;

export type Config = {|
  volume: number,
  playbackRate: number,
  // user can select any supported audio channels to view and play
  selectedChannel: number,
  showAllChannels: boolean,
  topicToRender: ?string,
|};

type Props = {
  ...ProcessedAudioData,
  width: number,
  height: number,
  config: Config,
  saveConfig: ($Shape<Config>) => void,
};

function AudioPlayerBase({
  channelCount,
  height,
  messageTimestamps,
  samples,
  samplingRate,
  saveConfig,
  width,
  config: { volume = 1, playbackRate = 1, selectedChannel: selectedChannelAlt = 0, showAllChannels = false },
}: Props) {
  const hoverBar = useRef<?HTMLElement>();
  const [hoverComponentId] = useState<string>(uuid.v4());
  const {
    globalSeek,
    globalStartTime,
    globalEndTime,
    globalCurrentTime,
    globalLastSeekTime,
    globalIsPlaying,
  } = useMessagePipeline(
    useCallback(
      ({ seekPlayback, playerState: { activeData } }) => ({
        globalSeek: seekPlayback,
        globalStartTime: activeData && activeData.startTime,
        globalEndTime: activeData && activeData.endTime,
        globalCurrentTime: activeData && activeData.currentTime,
        globalIsPlaying: activeData && activeData.isPlaying,
        globalLastSeekTime: activeData && activeData.lastSeekTime,
      }),
      []
    )
  );

  const [audioContext] = useState(() => new (window.AudioContext || window.webkitAudioContext)());
  // automatically close audioContext when the component unmounts
  useCleanup(() => audioContext.close());

  const [gainNode] = useState(() => audioContext.createGain()); // for volume control
  // use useRef for states that are getting updated during canvas drawing cycle
  const sourceRef = useRef<?AudioBufferSourceNode>();
  const currentPositionRef = useRef(0); // current played time relative to the whole audio buffer duration
  const startTimeRef = useRef(0); // audioContext.currentTime at which the audio started to play
  const canvasRef = useRef<?HTMLCanvasElement>();
  const timestampDivRef = useRef<?HTMLDivElement>();
  const [showReceiveTimestamp, setShowReceiveTimestamp] = useState(false);

  // Using isPlayingState and isPlayingRef to track isPlaying state separately for react and
  // requestAnimationFrame updates. We could essentially use one state 'isPlayState' + 'useEffect',
  // but source.onended is called on every pause which made it hard to track the currentTime of the player
  const isPlayingRef = useRef<boolean>(false); // track the playing state of the audio, for updating canvas
  const [isPlayingState, setIsPlayingState] = useState<boolean>(false); // for triggering AudioToolBar change

  const channelOptions = useMemo(
    () => new Array(channelCount).fill().map((_, idx) => ({ value: idx, label: `${idx}` })),
    [channelCount]
  );

  // make sure selectedChannel is in the range
  const selectedChannel = clamp(selectedChannelAlt, 0, channelCount - 1);

  // only update audio buffer when inputs change
  const buffers = useMemo(
    () => generateAudioBuffersFromSample(samples, selectedChannel, showAllChannels, audioContext, samplingRate),
    [samples, selectedChannel, showAllChannels, audioContext, samplingRate]
  );
  // the audio buffer that's being played/selected
  const activeBuffer = showAllChannels ? buffers[selectedChannel] : buffers[0];
  const totalSecs = activeBuffer.duration;

  const callbackInputsRef = useRef({ currentTime: audioContext.currentTime });
  callbackInputsRef.current = { currentTime: audioContext.currentTime };

  const getCurrentTimestamp = useCallback((playedRatio: number): ?Time => {
    const timestampIndex = Math.floor(messageTimestamps.length * playedRatio);
    const currentMsgTimestamp = messageTimestamps[timestampIndex];
    if (!currentMsgTimestamp) {
      return;
    }
    return showReceiveTimestamp ? currentMsgTimestamp.receiveTime : currentMsgTimestamp.headerStamp;
  }, [messageTimestamps, showReceiveTimestamp]);

  const updateTimestampText = useCallback((ratio: number) => {
    // generate current timestamp for copying
    const currentTimeStamp = getCurrentTimestamp(ratio);
    const timestampDiv = timestampDivRef.current;
    if (timestampDiv && currentTimeStamp) {
      timestampDiv.innerHTML = formatTimeRaw(currentTimeStamp);
    }
  }, [getCurrentTimestamp]);

  const updateCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const playedRatio = currentPositionRef.current / totalSecs;
    updateTimestampText(playedRatio);
    const bounds = buffers.map((buffer) => calculateWaveformData(buffer, canvas.width, POINT_WIDTH));
    drawWaveform(bounds, canvas, DEFAULT_WAVE_CONFIG, playedRatio, selectedChannel);
  }, [totalSecs, updateTimestampText, buffers, selectedChannel]);

  const timestampOnChange = useCallback(() => {
    setShowReceiveTimestamp((showReceive) => !showReceive);
    updateCanvas();
  }, [updateCanvas]);

  function pause() {
    if (sourceRef.current) {
      sourceRef.current.stop(0);
      sourceRef.current = null;
    }

    setIsPlayingState(false);
    isPlayingRef.current = false;
    currentPositionRef.current = audioContext.currentTime - startTimeRef.current;
  }

  function stop() {
    pause();
    currentPositionRef.current = 0;
  }

  // to be called to update canvas continuously during the audio play
  function tick() {
    const canvas = canvasRef.current;
    if (!isPlayingRef.current || !canvas) {
      return;
    }
    const newPosition = (audioContext.currentTime - startTimeRef.current) * playbackRate;
    currentPositionRef.current = newPosition;
    if (newPosition > totalSecs) {
      // stop playing when reached the end or over
      stop();
      updateCanvas();
      return;
    }
    updateCanvas();
    requestAnimationFrame(tick);
  }

  function play() {
    if (isPlayingRef.current) {
      pause();
      return;
    }
    // only set the new state once
    if (!isPlayingState) {
      setIsPlayingState(true);
    }
    const source = audioContext.createBufferSource();
    source.onended = () => setIsPlayingState(false);
    sourceRef.current = source;
    source.buffer = activeBuffer;
    source.playbackRate.value = playbackRate;
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    source.start(audioContext.currentTime, currentPositionRef.current);
    isPlayingRef.current = true;
    startTimeRef.current = audioContext.currentTime - currentPositionRef.current;
    requestAnimationFrame(tick);
  }

  function onDownloadAudio() {
    if (showAllChannels) {
      downloadFiles(
        buffers.map((buffer, idx) => {
          return {
            blob: bufferToFileBlob(buffer),
            fileName: `audio_channel_${idx}`,
          };
        })
      );
    } else {
      downloadFiles([{ blob: bufferToFileBlob(activeBuffer), fileName: "audio" }]);
    }
  }

  // redraw the waveform when the audio buffer, width or height changes
  useEffect(
    () => {
      updateCanvas();
    },
    // eslint-disable-next-line  react-hooks/exhaustive-deps
    [activeBuffer, width, height]
  );
  // reset the gainNode value when the volume changes
  useEffect(() => {
    gainNode.gain.setValueAtTime(volume, callbackInputsRef.current.currentTime);
  }, [gainNode.gain, volume]);

  const [draggingStart, setDraggingStart] = useState(null);
  const canvasHeight = buffers.length > 1 ? CHANNEL_HEIGHT * buffers.length : height - BAR_HEIGHT;
  const canvasWidth = width - CANVAS_MARGIN * 2;

  useEventListener(
    window,
    "mousemove",
    !!draggingStart,
    (ev: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!draggingStart || !canvas) {
        return;
      }
      const delta = ev.clientX - draggingStart.clientX;
      const deltaPosition = (delta / canvasWidth) * totalSecs;
      const newPosition = clamp(draggingStart.value + deltaPosition, 0, totalSecs);
      currentPositionRef.current = newPosition;
      updateCanvas();
    },
    [canvasWidth, totalSecs]
  );

  useEventListener(
    window,
    "mouseup",
    !!draggingStart,
    (_event: MouseEvent) => {
      setDraggingStart(null);
    },
    []
  );

  const setHoverValue = useSetHoverValue();
  const onMouseMove = useCallback((ev) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    ev.preventDefault();
    // move the currentPosition to the clicked position and update canvas
    const rect = canvas.getBoundingClientRect();
    const left = ev.clientX - rect.left;
    // Keep the ratio within 1 since it's possible to go over the audio wave as we usually round up global playback time.
    const hoveredRatio = clamp(left / canvasWidth, 0, 1);
    // Only draw the timestamp on hover when not playing.
    if (!isPlayingRef.current) {
      updateTimestampText(hoveredRatio);
    }
    const timeInSecFromStart = totalSecs * hoveredRatio;
    setHoverValue({ componentId: hoverComponentId, type: "PLAYBACK_SECONDS", value: timeInSecFromStart });
  }, [canvasWidth, setHoverValue, hoverComponentId, totalSecs, updateTimestampText]);

  const clearHoverValue = useClearHoverValue();
  const onMouseLeave = useCallback((ev) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    ev.preventDefault();
    clearHoverValue(hoverComponentId);
    // Reset the timestamp text.
    const playedRatio = currentPositionRef.current / totalSecs;
    updateTimestampText(playedRatio);
  }, [clearHoverValue, hoverComponentId, totalSecs, updateTimestampText]);
  const scaleBounds = useMemo(
    () => ({
      // HoverBar takes a ref to avoid rerendering (and avoid needing to rerender) when the bounds
      // change in charts that scroll at playback speed.
      current: [
        {
          id: hoverComponentId,
          min: 0,
          max: totalSecs,
          axes: "xAxes",
          minAlongAxis: 0,
          maxAlongAxis: canvasWidth,
        },
        {
          id: hoverComponentId,
          min: 0,
          max: canvasHeight,
          axes: "yAxes",
          minAlongAxis: 0,
          maxAlongAxis: canvasHeight,
        },
      ],
    }),
    [canvasHeight, canvasWidth, hoverComponentId, totalSecs]
  );

  const globalSeekChanged = useChangeDetector([globalLastSeekTime], false);
  // Update the audio played position to the new global played position if the user paused global playback and is seeking globally.
  if (globalSeekChanged) {
    const canvas = canvasRef.current;
    if (!globalIsPlaying && globalStartTime && globalEndTime && globalCurrentTime && canvas) {
      const totalGlobalSecs = toSec(subtractTimes(globalEndTime, globalStartTime));
      const globalPlayedRatio = toSec(subtractTimes(globalCurrentTime, globalStartTime)) / totalGlobalSecs;
      currentPositionRef.current = globalPlayedRatio * totalGlobalSecs;
      updateCanvas();
    }
  }

  return (
    <>
      <SCanvasWrapper
        style={{ height: height - BAR_HEIGHT }}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        onMouseDown={(ev) => {
          const canvas = canvasRef.current;
          if (!canvas) {
            return;
          }
          ev.preventDefault();
          pause();
          // move the currentPosition to the clicked position and update canvas
          const rect = canvas.getBoundingClientRect();
          const left = ev.clientX - rect.left;
          const clickedWidthRatio = left / canvasWidth;
          const currentTimeStamp = getCurrentTimestamp(clickedWidthRatio);
          if (currentTimeStamp) {
            globalSeek(currentTimeStamp);
          }

          currentPositionRef.current = clickedWidthRatio * totalSecs;
          // No need to redraw if the user just sought globally since the global seek already triggered another redraw.
          if (!globalSeekChanged) {
            updateCanvas();
          }
          setDraggingStart({
            value: currentPositionRef.current,
            clientX: ev.clientX,
          });
          if (showAllChannels) {
            const top = ev.clientY - rect.top;
            const clickedHeightRatio = top / canvasHeight;
            const newSelectedChannel = Math.floor(channelCount * clickedHeightRatio);
            if (newSelectedChannel !== selectedChannel) {
              saveConfig({ selectedChannel: newSelectedChannel });
            }
          }
        }}>
        {buffers.length > 1 &&
          channelOptions.map(({ value }) => (
            <SChannelHover key={value} style={{ top: value * CHANNEL_HEIGHT, height: CHANNEL_HEIGHT }} />
          ))}
        <canvas width={canvasWidth} height={canvasHeight} ref={canvasRef} />
        <HoverBar componentId={hoverComponentId} isTimestampScale scaleBounds={scaleBounds}>
          <SBar xAxisIsPlaybackTime ref={hoverBar} />
        </HoverBar>
      </SCanvasWrapper>
      <SBarWrapper>
        <STimestampWrapper>
          <SDropdown>
            <Dropdown
              position="right"
              value={showReceiveTimestamp}
              text={showReceiveTimestamp ? "receive time" : "header.stamp"}
              onChange={timestampOnChange}>
              {TIMESTAMP_OPTIONS.map(({ label, value }) => (
                <option value={value} key={label}>
                  {label}
                </option>
              ))}
            </Dropdown>
          </SDropdown>
          <SCopyTimestamp
            onClick={() => timestampDivRef.current && clipboard.copy(timestampDivRef.current.textContent)}>
            <div ref={timestampDivRef} />
            <Icon fade style={{ margin: "0 8px", verticalAlign: "middle" }} tooltip="Copy time to clipboard">
              <ClipboardOutlineIcon />
            </Icon>
          </SCopyTimestamp>
        </STimestampWrapper>
        <AudioToolbar
          chanelOptions={channelOptions}
          onPlaybackRateChange={(newPlaybackRate) => saveConfig({ playbackRate: newPlaybackRate })}
          onSelectedChannelChange={(newSelectedChannel) => {
            // updateCanvas is in different cycle from react update, we could recreate the buffer
            // before the next updateCanvas or stop now and wait for the next react update which will
            // automatically create a new buffer
            stop();
            saveConfig({ selectedChannel: newSelectedChannel });
          }}
          onTogglePlay={play}
          onToggleShowAllChannels={() => saveConfig({ showAllChannels: !showAllChannels })}
          onVolumeChange={(newVolume) => saveConfig({ volume: newVolume })}
          playbackRate={playbackRate}
          selectedChannel={selectedChannel}
          showAllChannels={showAllChannels}
          speedSelectOptions={SPEED_SELECT_OPTIONS}
          volume={volume}
          isPlaying={isPlayingState}
          downloadTooltip={showAllChannels ? `Download all the audio channels` : `Download audio`}
          onDownloadAudio={onDownloadAudio}
        />
      </SBarWrapper>
    </>
  );
}

export default function AudioPlayer(props: $Diff<Props, { width: number, height: number }>) {
  return (
    <SAudioPlayer>
      <Dimensions>{({ width, height }) => <AudioPlayerBase {...props} width={width} height={height} />}</Dimensions>
    </SAudioPlayer>
  );
}
