// @flow
//
//  Copyright (c) 2021-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import CheckboxBlankOutlineIcon from "@mdi/svg/svg/checkbox-blank-outline.svg";
import CheckboxMarkedIcon from "@mdi/svg/svg/checkbox-marked.svg";
import DownloadIcon from "@mdi/svg/svg/download.svg";
import PauseIcon from "@mdi/svg/svg/pause.svg";
import PlayIcon from "@mdi/svg/svg/play.svg";
import * as React from "react";
import styled from "styled-components";

import VolumeControl from "./VolumeControl";
import Dropdown from "webviz-core/src/components/Dropdown";
import Icon from "webviz-core/src/components/Icon";
import Item from "webviz-core/src/components/Menu/Item";

const SBar = styled.div`
  display: flex;
  align-items: center;
`;

const SPlayButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
`;

const SSpeedWrapper = styled.div`
  width: 64;
  button {
    background: transparent;
  }
`;

const STransparentDropdownBtn = styled.div`
  button {
    background: transparent;
  }
`;

const MIN_VOLUME = 0;
const MAX_VOLUME = 4;
const VOLUME_CHANGE_STEP = 0.1;

type Option = {
  label: string,
  value: number,
};

type Props = {
  chanelOptions: Option[],
  downloadTooltip: string,
  isPlaying: boolean,
  onDownloadAudio: () => void,
  onPlaybackRateChange: (number) => void,
  onSelectedChannelChange: (number) => void,
  onTogglePlay: () => void,
  onToggleShowAllChannels: () => void,
  onVolumeChange: (number) => void,
  playbackRate: number,
  selectedChannel: number,
  showAllChannels: boolean,
  speedSelectOptions: Option[],
  volume: number,
};

export default function AudioToolbar({
  chanelOptions,
  downloadTooltip,
  isPlaying,
  onDownloadAudio,
  onPlaybackRateChange,
  onSelectedChannelChange,
  onTogglePlay,
  onToggleShowAllChannels,
  onVolumeChange,
  playbackRate,
  selectedChannel,
  showAllChannels,
  speedSelectOptions,
  volume,
}: Props) {
  return (
    <SBar>
      <SPlayButton onClick={onTogglePlay}>
        <Icon medium>{isPlaying ? <PauseIcon /> : <PlayIcon />}</Icon>
      </SPlayButton>
      <SSpeedWrapper>
        <Dropdown position="right" value={playbackRate} text={`${playbackRate}x`} onChange={onPlaybackRateChange}>
          {speedSelectOptions.map(({ label, value }) => (
            <option value={value} key={value}>
              {label}
            </option>
          ))}
        </Dropdown>
      </SSpeedWrapper>
      <VolumeControl
        rootStyle={{ width: 144, margin: "0 8px" }}
        value={volume}
        onChange={onVolumeChange}
        min={MIN_VOLUME}
        max={MAX_VOLUME}
        step={VOLUME_CHANGE_STEP}
      />
      <STransparentDropdownBtn>
        <Dropdown
          position="right"
          value={selectedChannel}
          text={`channel: ${selectedChannel}`}
          onChange={onSelectedChannelChange}>
          {chanelOptions.map(({ label, value }) => (
            <option value={value} key={value}>
              {label}
            </option>
          ))}
        </Dropdown>
      </STransparentDropdownBtn>
      <Item
        icon={showAllChannels ? <CheckboxMarkedIcon /> : <CheckboxBlankOutlineIcon />}
        onClick={onToggleShowAllChannels}>
        show all channels
      </Item>
      <Icon fade medium clickable tooltip={downloadTooltip} onClick={onDownloadAudio}>
        <DownloadIcon />
      </Icon>
    </SBar>
  );
}
